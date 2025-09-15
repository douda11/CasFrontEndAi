export const API_CONFIG = {
  backend: {
    baseUrl: 'http://localhost:8081'
  },
  alptis: {
    baseUrl: 'http://localhost:8081/api/v1/tarification',
    apiKey: '9090557a-e301-4b2e-9523-37802cab6a8e',
    endpoints: {
      tarification: '/alptis',
      offres: '/alptis/offres',
      devisPdf: '/alptis/generate-devis',
      devisPdfTest: '/alptis/generate-devis-test'
    }
  },
  apivia: {
    baseUrl: 'http://localhost:8081/api/v1/tarification',
    apiKey: 'f85d0eb55e8e069acb908c1d11af4c6e',
    endpoints: {
      tarification: '/apivia',
      produits: '/apivia/produits'
    }
  },
  utwin: {
    baseUrl: 'http://localhost:8081/api/utwin',
    licence: '6519cef5-168d-4931-b15d-c1ca46ee59f5',
    contexteVendeur: 'MALA00759',
    endpoints: {
      tarification: '/tarification'
    }
  },
  april: {
    baseUrl: 'http://localhost:8081/api/v1',
    clientId: '95414-64946-brokins',
    clientSecret: 'OouS4Rc9dFhwl8Px4Qlv6i_nQ6FS0OaakZvIeRlWM6E',
    endpoints: {
      healthProtection: '/healthProtection',
      professionalCategories: '/healthProtection/professionalCategories',
      professions: '/healthProtection/professions',
      professionalStatus: '/healthProtection/professionalStatus',
      projects: '/healthProtection/projects',
      prices: '/healthProtection/projects/prices'
    }
  },
  deuxma: {
    baseUrl: 'http://localhost:8081/api/deuxma/v1/tarifs',
    endpoints: {
      acheel: '/acheel',
      createDevis: '/acheel/devis'
    }
  },
  comparator: {
    baseUrl: 'http://127.0.0.1:5000',
    endpoints: {
      compare: '/compare'
    }
  },
  auth: {
    baseUrl: 'http://localhost:8081/api/v1/auth',
    endpoints: {
      login: '/login',
      logout: '/logout',
      refresh: '/refresh'
    }
  }
};
