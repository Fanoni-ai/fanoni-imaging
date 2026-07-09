/** @type {AppTypes.Config} */
// Fanoni imaging — AWS HealthImaging via the Fanoni viewer auth proxy.
// The proxy (Lambda Function URL) validates the bearer token OHIF picks up from
// the ?token= deep-link param, then re-signs the DICOMweb request (SigV4) to
// HealthImaging. No pixel data touches the VPS Orthanc.
window.config = {
  routerBasename: '/',
  extensions: [],
  modes: [],
  showStudyList: true,
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Fanoni HealthImaging',
        name: 'aws-healthimaging',
        wadoUriRoot: 'https://6rm524qyb6f52snqpfjd3z7sha0ebwjh.lambda-url.us-east-1.on.aws',
        qidoRoot: 'https://6rm524qyb6f52snqpfjd3z7sha0ebwjh.lambda-url.us-east-1.on.aws',
        wadoRoot: 'https://6rm524qyb6f52snqpfjd3z7sha0ebwjh.lambda-url.us-east-1.on.aws',
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
