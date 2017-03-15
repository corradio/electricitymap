import arrow
import os
import pandas as pd
import requests

endpoint = 'http://api.electricitymap.org'
r = requests.session()

ELECTRICITYMAP_TOKEN = os.environ['ELECTRICITYMAP_TOKEN']

def date_range(start_date, end_date, delta):
    start, end = [
        arrow.get(start_date),
        arrow.get(end_date)
    ]
    if end < start: raise Exception('End date can\' be before start date')
    time_span = [start]
    while True:
        t = time_span[-1].replace(minutes=+delta)
        if t > end: break
        time_span.append(t)
    return time_span

# get_production

def fetch_production(country_code, t, delta):
    url = '%s/v1/production' % endpoint
    params = {
        'countryCode': country_code,
        'datetime': t.isoformat()
    }
    obj = r.get(url, params=params, headers={'ELECTRICITYMAP-TOKEN': ELECTRICITYMAP_TOKEN}).json()
    if not obj: return
    return obj if (t - arrow.get(obj['datetime'])).total_seconds() < delta * 60.0 else None

def get_production(countries, start_date, end_date, delta):
    df = None
    time_span = date_range(start_date, end_date, delta)
    for country in countries:
        print 'Fetching country %s..' % country
        for t in time_span:
            o = fetch_production(country, t, delta)
            if not o: continue
            modes = o['production'].keys()
            p = pd.DataFrame(
                data={
                    'timestamp': pd.Timestamp(arrow.get(o['datetime']).datetime),
                    'country': country,
                    'mode': modes,
                    'production': map(lambda k: o['production'][k], modes),
                })
            if df is not None: df = df.append(p)
            else: df = p
    return df

# get_exchange

def fetch_exchange(country_code, t):
    url = '%s/v1/exchanges' % endpoint
    params = {
        'datetime': t.isoformat(),
        'countryCode': country_code
    }
    obj = r.get(url, params=params, headers={'ELECTRICITYMAP-TOKEN': ELECTRICITYMAP_TOKEN}).json()
    return obj['data']

def get_exchange(countries, start_date, end_date, delta):
    df = None
    time_span = date_range(start_date, end_date, delta)
    for country_code in countries:
        print 'Fetching country %s..' % country_code
        for t in time_span:
            o = fetch_exchange(country_code, t)
            if not o: continue
            country_exchanges = o.values()
            # Make sure `from` is always `country_code`
            country_tos = []
            net_flows = []
            for item in country_exchanges:
                sorted_country_codes = item['sortedCountryCodes'].split('->')
                if sorted_country_codes[0] == country_code:
                    country_tos.append(sorted_country_codes[1])
                    net_flows.append(item['netFlow'])
                else:
                    country_tos.append(sorted_country_codes[0])
                    net_flows.append(-1 * item['netFlow'])
            timestamps = map(lambda x: pd.Timestamp(arrow.get(x['datetime']).datetime),
                country_exchanges)
            p = pd.DataFrame({'country_from': country_code,
                              'timestamp': timestamps,
                              'country_to': country_tos,
                              'net_flow': net_flows})
            if df is not None: df = df.append(p)
            else: df = p
    return df

# get_state

def fetch_state(t, delta):
    url = '%s/v1/state' % endpoint
    params = {
        'datetime': t.isoformat()
    }
    obj = r.get(url, params=params, headers={'ELECTRICITYMAP-TOKEN': ELECTRICITYMAP_TOKEN}).json()
    if not obj: return
    return obj['data']

def get_state(countries, start_date, end_date, delta):
    df = None
    time_span = date_range(start_date, end_date, delta)
    for t in time_span:
        o = fetch_state(t, delta)
        if not o: continue
        for countryCode in countries:
            if not countryCode in o['countries']: continue
            d = o['countries'][countryCode]
            if not 'datetime' in d: continue
            p = pd.DataFrame(
                data={
                    'timestamp': pd.Timestamp(t.datetime),
                    'country': countryCode,
                    'co2intensity': d.get('co2intensity', None),
                    'fossilFuelRatio': d.get('fossilFuelRatio', None),
                    'totalImport': d.get('totalImport', None),
                    'totalExport': d.get('totalExport', None),
                    'totalProduction': d.get('totalProduction', None),
                    # Production
                    'wind': d.get('production', {}).get('wind', None),
                    'solar': d.get('production', {}).get('solar', None),
                    'hydro': d.get('production', {}).get('hydro', None),
                    'geothermal': d.get('production', {}).get('geothermal', None),
                    'biomass': d.get('production', {}).get('biomass', None),
                    'nuclear': d.get('production', {}).get('nuclear', None),
                    'gas': d.get('production', {}).get('gas', None),
                    'coal': d.get('production', {}).get('coal', None),
                    'oil': d.get('production', {}).get('oil', None),
                    'unknown': d.get('production', {}).get('unknown', None)
                },
                index=[0])
            if df is not None: df = df.append(p)
            else: df = p
    return df

# get_price

def fetch_price(country_code, t, delta):
    url = '%s/v1/price' % endpoint
    params = {
        'countryCode': country_code,
        'datetime': t.isoformat()
    }
    obj = r.get(url, params=params, headers={'ELECTRICITYMAP-TOKEN': ELECTRICITYMAP_TOKEN}).json()
    if not obj: return
    return obj if (t - arrow.get(obj['datetime'])).total_seconds() < delta * 60.0 else None

def get_price(countries, start_date, end_date, delta):
    df = None
    time_span = date_range(start_date, end_date, delta)
    for country in countries:
        print 'Fetching country %s..' % country
        for t in time_span:
            o = fetch_price(country, t, delta)
            if not o: continue
            p = pd.DataFrame(
                data={
                    'timestamp': pd.Timestamp(arrow.get(o['datetime']).datetime),
                    'country': country,
                    'price': o['price'],
                }, index = [pd.Timestamp(arrow.get(o['datetime']).datetime)])
            if df is not None: df = df.append(p)
            else: df = p
    return df
