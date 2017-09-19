#!/usr/bin/python

import arrow
from collections import defaultdict
import requests

url ='http://tr.ons.org.br/Content/GetBalancoEnergetico/null'

generation_mapping = {
                      u'nuclear': 'nuclear',
                      u'eolica': 'wind',
                      u'termica': 'unknown',
                      u'solar': 'solar',
                      'hydro' : 'hydro'
                      }

regions = {
           'BR_NE': u'nordeste',
           'BR_N': u'norte',
           'BR_CS': u'sudesteECentroOeste',
           'BR_S': u'sul'
           }

region_exchanges = {
                    'BR_CS->BR_S': "sul_sudeste",
                    'BR_CS->BR_NE':"sudeste_nordeste",
                    'BR_CS->BR_N':"sudeste_norteFic",
                    'BR_N->BR_NE': "norteFic_nordeste"
                    }


def get_data(session = None):
    """Requests generation data in json format."""

    s = session or requests.session()
    json_data = s.get(url).json()

    return json_data


def production_processor(json_data, country_code):
    """
    Extracts data timestamp and sums regional data into totals by key.
    Maps keys to type and returns a tuple.
    """

    dt = arrow.get(json_data['Data'])
    totals = defaultdict(lambda: 0.0)

    region = regions[country_code]
    breakdown = json_data[region][u'geracao']
    for generation, val in breakdown.items():
        totals[generation] += val

    #BR_CS contains the Itaipu Dam.
    #We merge the hydro keys into one, then remove unnecessary keys.
    totals['hydro'] = totals.get(u'hidraulica', 0.0) + totals.get(u'itaipu50HzBrasil', 0.0) + totals.get(u'itaipu60Hz', 0.0)
    entriesToRemove = (u'hidraulica', u'itaipu50HzBrasil', u'itaipu60Hz', u'total')
    for k in entriesToRemove:
        totals.pop(k, None)

    mapped_totals = {generation_mapping.get(name, 'unknown'): val for name, val in totals.items()}

    return dt, mapped_totals


def fetch_production(country_code, session = None):
    """
    Requests the last known production mix (in MW) of a given country
    Arguments:
    country_code (optional) -- used in case a parser is able to fetch multiple countries
    session (optional)      -- request session passed in order to re-use an existing session
    Return:
    A dictionary in the form:
    {
      'countryCode': 'FR',
      'datetime': '2017-01-01T00:00:00Z',
      'production': {
          'biomass': 0.0,
          'coal': 0.0,
          'gas': 0.0,
          'hydro': 0.0,
          'nuclear': null,
          'oil': 0.0,
          'solar': 0.0,
          'wind': 0.0,
          'geothermal': 0.0,
          'unknown': 0.0
      },
      'storage': {
          'hydro': -10.0,
      },
      'source': 'mysource.com'
    }
    """

    gd = get_data()
    generation = production_processor(gd, country_code)

    datapoint = {
      'countryCode': country_code,
      'datetime': generation[0].datetime,
      'production': generation[1],
      'storage': {
          'hydro': None,
      },
      'source': 'ons.org.br'
    }

    return datapoint

def fetch_exchange(country_code1='BR', country_code2='UY', session=None):
    """Requests the last known power exchange (in MW) between two regions
    Arguments:
    country_code1           -- the first country code
    country_code2           -- the second country code; order of the two codes in params doesn't matter
    session (optional)      -- request session passed in order to re-use an existing session
    Return:
    A dictionary in the form:
    {
      'sortedCountryCodes': 'DK->NO',
      'datetime': '2017-01-01T00:00:00Z',
      'netFlow': 0.0,
      'source': 'mysource.com'
    }
    where net flow is from DK into NO
    """

    gd = get_data()

    data = {
        'datetime': arrow.get(gd['Data']).datetime,
        'sortedCountryCodes': 'BR->UY',
        'netFlow': gd['internacional']['uruguai'],
        'source': 'ons.org.br'
    }

    return data


def fetch_region_exchange(region1, region2, session = None):
    """
    Requests the last known power exchange (in MW) between two Brazilian regions.
    Arguments:
    region1           -- the first region
    region2           -- the second region; order of the two codes in params doesn't matter
    session (optional)      -- request session passed in order to re-use an existing session
    Return:
    A dictionary in the form:
    {
      'sortedCountryCodes': 'DK->NO',
      'datetime': '2017-01-01T00:00:00Z',
      'netFlow': 0.0,
      'source': 'mysource.com'
    }
    where net flow is from DK into NO
    """

    gd = get_data()
    dt = arrow.get(gd['Data']).datetime
    scc = '->'.join(sorted([region1, region2]))

    exchange = region_exchanges[scc]
    nf = gd['intercambio'][exchange]

    data = {
        'datetime': dt,
        'sortedCountryCodes': scc,
        'netFlow': nf,
        'source': 'ons.org.br'
    }

    return data


if __name__ ==  '__main__':
    """Main method, never used by the Electricity Map backend, but handy for testing."""

    print('fetch_production(BR_NE) ->')
    print(fetch_production('BR_NE'))

    print('fetch_production(BR_N) ->')
    print(fetch_production('BR_N'))

    print('fetch_production(BR_CS) ->')
    print(fetch_production('BR_CS'))

    print('fetch_production(BR_S) ->')
    print(fetch_production('BR_S'))

    print('fetch_exchange() ->')
    print(fetch_exchange())

    print('fetch_region_exchange(BR_CS->BR_S)')
    print(fetch_region_exchange('BR_CS', 'BR_S'))

    print('fetch_region_exchange(BR_CS->BR_NE)')
    print(fetch_region_exchange('BR_CS', 'BR_NE'))

    print('fetch_region_exchange(BR_CS->BR_N)')
    print(fetch_region_exchange('BR_CS', 'BR_N'))

    print('fetch_region_exchange(BR_N->BR_NE)')
    print(fetch_region_exchange('BR_N', 'BR_NE'))
