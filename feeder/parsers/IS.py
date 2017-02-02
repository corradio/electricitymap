import requests
from datetime import datetime
from collections import defaultdict
import xml.etree.ElementTree as ET
import json

STATIONS = {

    # http://www.landsvirkjun.com/company/powerstations/
    'Bjarnaflag': 'unknown',    # Geothermal (no data?)
    'BLANDA_F': 'hydro',
    'BUDAR_O': 'hydro',
    'BURF_F': 'hydro',
    'FLJOTSDA': 'hydro',
    'Hafio': 'wind',            # No data?
    'HRAUN_F': 'hydro',
    'IRAFOS_F': 'hydro',
    'KRAFLA_F': 'unknown',      # Geothermal
    'LAXA_F': 'hydro',
    'LAXARVAT': 'hydro',
    'laxa': 'hydro',            # No data?
    'LJOSIF_F': 'hydro',
    'SIG_F': 'hydro',
    'Steingrimsstod': 'hydro',  # No data?
    'SULTAR_F': 'hydro',
    'VATNSHAM': 'hydro',

    # https://en.wikipedia.org/wiki/List_of_power_stations_in_Iceland
    'KOLVID': 'unknown',        # Geothermal
    'LAGARF': 'hydro',
    'MJOLKA': 'hydro',
    'REY': 'unknown',           # Geothermal
    'X_NESJAV': 'unknown',      # Geothermal
    'SVA': 'unknown',           # Geothermal 
}

def fetch_production(country_code='IS', session=None):

    # Query Landsnet for latest power production data for Iceland
    r = session or requests.session()
    url = 'http://amper.landsnet.is/MapData/api/measurements'
    response = r.get(url)
    json_obj = json.loads(response.text)

    production = defaultdict(float)

    # Calculate production values for each power station
    for key, value in STATIONS.items():
        items = [item for item in json_obj if item["substation"] == key and item["MW"] >= 0]
        mw = sum(item['MW'] for item in items)
        production[value] = production[value] + mw;

    # Get datetime for last update (e.g. 2017-02-02T14:35:00)
    totalpowerflow = next(item for item in json_obj if item["key"] == "TOTAL_POWER_FLOW")
    datetime_last = datetime.strptime(totalpowerflow["time"], '%Y-%m-%dT%H:%M:%S')

    data = {
        'countryCode': country_code,
        'production': dict(production),
        'datetime': datetime_last,
        'storage': {},
        'source': 'landsnet.is',
    }
    return data

if __name__ == '__main__':
    print fetch_production()