#!/usr/bin/env python3

# The arrow library is used to handle datetimes consistently with other parsers
import arrow

# The request library is used to fetch content through HTTP
import requests

# BeautifulSoup is used to parse HTML to get information
from bs4 import BeautifulSoup


timezone = 'Canada/Newfoundland'


def fetch_production(zone_key='CA-NL-NF', session=None, target_datetime=None, logger=None):
    """Requests the last known production mix (in MW) of a given country

    Arguments:
    zone_key       -- ignored here, only information for CA-NB is returned
    session (optional) -- request session passed in order to re-use an existing session

    Return:
    A dictionary in the form:
    {
      'zoneKey': 'FR',
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
    """
    In this case, we are calculating the amount of electricity generated
    in Newfoundland Island.
    """

    if target_datetime:
        raise NotImplementedError('This parser is not yet able to parse past dates')

    requests_obj = session or requests.session()

    url = 'https://nlhydro.com/system-information/supply-and-demand/'
    response = requests_obj.get(url)

    soup = BeautifulSoup(response.text, "html.parser")
    system = soup.find('div', {"id": "sysgen"})
    ps = system.findAll("p")

    unknownMw = float(ps[0].text.replace("MW", "").strip())
    updatedAt = arrow.get(ps[1].find("span").text, "M/D/YYYY H:m A", tzinfo=timezone)


    data = {
        'datetime': updatedAt.datetime,
        'zoneKey': zone_key,
        'production': {
            'unknown': unknownMw
        },
        'storage': {},
        'source': 'nlhydro.com'
    }

    return data



if __name__ == '__main__':
    """Main method, never used by the Electricity Map backend, but handy for testing."""

    print('fetch_production() ->')
    print(fetch_production())
