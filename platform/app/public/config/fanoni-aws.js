/** @type {AppTypes.Config} */
// Fanoni imaging — AWS HealthImaging via the Fanoni viewer auth proxy, plus
// public OHIF sample DICOMweb for demos. Keep in sync with
// fanoni-ehr/fanoni-healthimaging/ohif/app-config.js (CloudFront overlay).
//
// The proxy (Lambda Function URL) validates the bearer token OHIF picks up from
// the ?token= deep-link param, then re-signs the DICOMweb request (SigV4) to
// HealthImaging. Sample datasources stay unauthenticated.
(function () {
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

  var root = 'https://6rm524qyb6f52snqpfjd3z7sha0ebwjh.lambda-url.us-east-1.on.aws';
  var ohifDemo = 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb';
  var ohifDemo3 = 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb';

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
          /* ignore */
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

  window.config = {
    routerBasename: '/',
    extensions: [],
    modes: [],
    showStudyList: true,
    groupEnabledModesFirst: true,
    showWarningMessageForCrossOrigin: true,
    showCPUFallbackMessage: true,
    showLoadingIndicator: true,
    strictZSpacingForVolumeViewport: true,
    investigationalUseDialog: { option: 'never' },
    maxNumberOfWebWorkers: 3,
    defaultDataSourceName: 'dicomweb',
    dataSources: [
      {
        namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
        sourceName: 'dicomweb',
        configuration: {
          friendlyName: 'Fanoni HealthImaging',
          name: 'aws-healthimaging',
          wadoUriRoot: root,
          qidoRoot: root,
          wadoRoot: root,
          qidoSupportsIncludeField: false,
          imageRendering: 'wadors',
          thumbnailRendering: 'wadors',
          enableStudyLazyLoad: true,
          supportsFuzzyMatching: false,
          supportsWildcard: true,
          omitQuotationForMultipartRequest: true,
          bulkDataURI: { enabled: true },
          headers: token ? { Authorization: 'Bearer ' + token } : {},
          requestOptions: { auth: authHeader },
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
          bulkDataURI: { enabled: true, relativeResolution: 'studies' },
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
