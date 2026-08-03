/**
 * Fanoni OHIF runtime config (overlay for the CloudFront-hosted viewer).
 *
 * Pin / rebuild notes: see fanoni-healthimaging/ohif/README.md
 * Target OHIF source: /Users/dafe/repos/fanoni-imaging (fork of OHIF/Viewers)
 * Target tag: v3.14.0-beta.8 (origin/master as of 2026-08-03)
 *
 * Data sources:
 *   - dicomweb (default): Fanoni HealthImaging via viewer auth proxy (token required)
 *   - ohif / ohif3: public OHIF demo DICOMweb (no Fanoni token; safe for demos)
 *   - dicomjson / dicomlocal: local file / JSON loaders
 *
 * Auth: only requests to the HealthImaging proxy root get the bearer. Sample
 * datasources stay unauthenticated so clinicians can open demos without minting
 * a viewer token. Prod HealthImaging deep-links (?token=) are unchanged.
 */
window.config = (function () {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || sessionStorage.getItem('fanoni_imaging_token') || '';
  if (token) {
    sessionStorage.setItem('fanoni_imaging_token', token);
    params.delete('token');
    var clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, clean);
    }
  }

  // Viewer-proxy URL mirrors the "Staging live" table in
  // fanoni-healthimaging/infrastructure/README.md — the canonical inventory to
  // update on redeploys.
  var root = 'https://6rm524qyb6f52snqpfjd3z7sha0ebwjh.lambda-url.us-east-1.on.aws';

  // Public OHIF demo DICOMweb (same endpoints ohif.org / default.js ship with).
  var ohifDemo = 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb';
  var ohifDemo3 = 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb';

  // This OHIF build's DICOMweb client does not honor configuration.headers or
  // requestOptions.auth (verified live: QIDO XHR arrives with no Authorization
  // → 401 "missing bearer token" → "Error: request failed"). Intercept XHR and
  // fetch so every call to the viewer proxy carries the minted bearer.
  // Only the HealthImaging proxy is targeted — public sample roots must stay open.
  (function installProxyAuth(proxyRoot) {
    function bearer() {
      var t = sessionStorage.getItem('fanoni_imaging_token') || token || '';
      return t ? 'Bearer ' + t : '';
    }
    function targetsProxy(url) {
      return String(url || '').indexOf(proxyRoot) === 0;
    }

    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__fanoniProxyUrl = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      var auth = bearer();
      if (auth && targetsProxy(this.__fanoniProxyUrl)) {
        try {
          this.setRequestHeader('Authorization', auth);
        } catch (e) {
          // Header already set / send already started — ignore.
        }
      }
      return origSend.call(this, body);
    };

    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : input && input.url;
        var auth = bearer();
        if (auth && targetsProxy(url)) {
          init = init ? Object.assign({}, init) : {};
          var headers = new Headers(init.headers || (input && input.headers) || undefined);
          if (!headers.has('Authorization')) headers.set('Authorization', auth);
          init.headers = headers;
        }
        return origFetch(input, init);
      };
    }
  })(root);

  function authHeader() {
    var t = sessionStorage.getItem('fanoni_imaging_token') || token || '';
    return t ? 'Bearer ' + t : undefined;
  }

  return {
    routerBasename: '/',
    // Empty arrays = load every mode/extension baked into the viewer build
    // (longitudinal/viewer = Advanced clinical, segmentation, tmtv, …).
    // `/basic` stays hidden by the mode package; EHR Open always uses /viewer.
    extensions: [],
    modes: [],
    showStudyList: true,
    groupEnabledModesFirst: true,
    // Do not surface proxy / CloudFront / lambda-url hostnames as chrome.
    showWarningMessageForCrossOrigin: false,
    showCPUFallbackMessage: true,
    showLoadingIndicator: true,
    strictZSpacingForVolumeViewport: true,
    investigationalUseDialog: { option: 'never' },
    maxNumberOfWebWorkers: 3,
    defaultDataSourceName: 'dicomweb',
    // Brand mark only — no domain / hostname wordmark on viewer chrome.
    whiteLabeling: {
      createLogoComponentFn: function (React) {
        return React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              letterSpacing: '-0.02em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
          },
          React.createElement(
            'svg',
            { width: '22', height: '22', viewBox: '0 0 32 32', fill: 'none', 'aria-hidden': 'true' },
            React.createElement('circle', { cx: '12', cy: '12', r: '8', fill: '#de8167', fillOpacity: '0.9' }),
            React.createElement('circle', { cx: '20', cy: '12', r: '8', fill: '#8e9867', fillOpacity: '0.85' }),
            React.createElement('circle', { cx: '12', cy: '20', r: '8', fill: '#b4553a', fillOpacity: '0.8' }),
            React.createElement('circle', { cx: '20', cy: '20', r: '8', fill: '#a65943', fillOpacity: '0.75' })
          ),
          React.createElement('span', null, 'Fanoni')
        );
      },
    },
    // Viewport corner overlays stay clinical (date / series / W/L / instance).
    // Never inject datasource URLs or hostnames onto the image plane.
    customizationService: {
      'viewportOverlay.topRight': [],
    },
    dataSources: [
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'dicomweb',
        configuration: {
          // Friendly label only — never a hostname (no fanoni.ai / CloudFront / lambda-url).
          friendlyName: 'Fanoni Imaging',
          name: 'aws-healthimaging',
          wadoUriRoot: root,
          qidoRoot: root,
          wadoRoot: root,
          qidoSupportsIncludeField: false,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          // Per-series metadata — HealthImaging's study-level /metadata returns 400,
          // series-level works. Lazy load fetches metadata per series.
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: false,
          supportsWildcard: true,
          omitQuotationForMultipartRequest: true,
          bulkDataURI: { enabled: true },
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          requestOptions: {
            auth: authHeader,
          },
        },
      },
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'ohif',
        configuration: {
          friendlyName: 'OHIF Sample Studies',
          name: 'ohif-demo',
          wadoUriRoot: ohifDemo,
          qidoRoot: ohifDemo,
          wadoRoot: ohifDemo,
          qidoSupportsIncludeField: false,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: true,
          supportsWildcard: false,
          staticWado: true,
          singlepart: 'bulkdata,video',
          bulkDataURI: {
            enabled: true,
            relativeResolution: 'studies',
            transform: function (url) {
              return String(url).replace('/pixeldata.mp4', '/rendered');
            },
          },
          omitQuotationForMultipartRequest: true,
        },
      },
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'ohif3',
        configuration: {
          friendlyName: 'OHIF Sample Studies (alt)',
          name: 'ohif-demo-3',
          wadoUriRoot: ohifDemo3,
          qidoRoot: ohifDemo3,
          wadoRoot: ohifDemo3,
          qidoSupportsIncludeField: false,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: false,
          supportsWildcard: true,
          staticWado: true,
          singlepart: 'bulkdata,video',
          bulkDataURI: {
            enabled: true,
            relativeResolution: 'studies',
          },
          omitQuotationForMultipartRequest: true,
        },
      },
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
        sourceName: 'dicomjson',
        configuration: { friendlyName: 'dicom json', name: 'json' },
      },
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
        sourceName: 'dicomlocal',
        configuration: { friendlyName: 'dicom local' },
      },
    ],
  };
})();
