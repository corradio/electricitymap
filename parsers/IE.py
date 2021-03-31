"""Parser for the Republic Of Ireland."""
import logging
from datetime import date, datetime, time, timedelta

import pandas as pd

import arrow
import requests


SOURCE = 'smartgriddashboard.eirgrid.com'
QUERY_ROOT = 'http://smartgriddashboard.eirgrid.com/DashboardService.svc/data'

MAPPING = {'FUEL_COAL': 'coal',
           'FUEL_GAS': 'gas',
           'FUEL_RENEW': 'renew',
           'FUEL_OTHER_FOSSIL': 'unknown',
           }


timezone = 'Europe/Dublin'

def format_date_inputs(a_date):
    return a_date.strftime('%d-%b-%Y+%H:%M').replace(':', '%3A')


def _fetch(base_url, session, logger, dateto, datefrom=None):
    '''Fetch data from base_url

    If datefrom is not specified, it is taken as `dateto - 15min`
    datetime and datefrom are in local time (ie. not Ireland time)'''
    r = session or requests.session()

    # will return `now` if target_datetime is None
    dateto = arrow.get(dateto).to(timezone)

    if not datefrom:
        datefrom = dateto.shift(minutes=-15)
    else:
        datefrom = arrow.get(dateto).to(timezone)

    datefrom = format_date_inputs(datefrom.datetime)
    dateto = format_date_inputs(dateto.datetime)


    url = base_url + f'&region=ROI&datefrom={datefrom}&dateto={dateto}'
    logger.info('Fetching URL: %s', url)

    res = r.get(url)
    if res.status_code != 200:
        raise Exception(
            f"Got error code {res.status_code} when fetching data for IE: "
            f"error when calling url={url}"
        )

    obj = res.json()
    if obj['Status'] != 'Success':
        raise Exception(
            f'Exception when fetching data for IE: error when calling url={url}'
        )
    return obj


def fetch_production(zone_key='ROI', session=None,
                     target_datetime: datetime = None,
                     logger: logging.Logger = logging.getLogger(__name__)):

    rows = _fetch(QUERY_ROOT + '?area=fuelmix', session, logger, target_datetime)['Rows']
    data = {
        'zoneKey': zone_key,
        'production': {MAPPING[row['FieldName']]: float(row['Value']) for row in rows
                       if row['FieldName'] in MAPPING},
        'storage': {},
        'source': SOURCE,
        'datetime': arrow.get(rows[0]['EffectiveTime'], 'DD-MMM-YYYY HH:mm:ss').replace(tzinfo=timezone).datetime,

    }

    return data

def fetch_exchange(zone_key1, zone_key2, session=None, target_datetime=None,
                   logger: logging.Logger = logging.getLogger(__name__)):
    """Requests the last known power exchange (in MW) between two countries
    Arguments:
    zone_key (optional) -- used in case a parser is able to fetch multiple countries
    session (optional)      -- request session passed in order to re-use an existing session
    Return:
    A dictionary in the form:
    {
      'sortedZoneKeys': 'DK->NO',
      'datetime': '2017-01-01T00:00:00Z',
      'netFlow': 0.0,
      'source': 'mysource.com'
    }
    """

    r = session or requests.session()


    if {zone_key1, zone_key2} == {'GB', 'IE'}:
        # This is the EWIC interconnector
        base_url = 'https://smartgriddashboard.eirgrid.com/DashboardService.svc/data?area=interconnection'
        last_updated = _fetch(base_url, session, logger, target_datetime)['LastUpdated']
        last_updated = arrow.get(last_updated, 'DD-MMM-YYYY HH:mm:ss').to('local')
        rows = _fetch(base_url, session, logger, last_updated, datefrom=last_updated.shift(minutes=60))

        return {
            'sortedZoneKeys': '->'.join(sorted([zone_key1, zone_key2])),
            'datetime': last_updated.datetime,
            'netFlow': rows['Rows'][0]['Value'],  # TODO: wip, sometimes this is None, not sure if this should be incoming or outcoming flow ?
            'source': SOURCE,
        }

    else:
        raise NotImplementedError('This exchange pair is not implemented')

if __name__=='__main__':
    from pprint import pprint
    logging.getLogger(__name__).setLevel(logging.DEBUG)

    pprint('PRODUCTION')
    data = fetch_production()
    pprint(data)
    # total = sum(data['production'].values())
    # print("total: {}".format(total))

    print('\n\nEXCHANGE')
    data = fetch_exchange('IE', 'GB')
    pprint(data)
