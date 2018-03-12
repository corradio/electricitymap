import datetime

import arrow


def validate_consumption(obj, zone_key):
    # Data quality check
    if obj['consumption'] is not None and obj['consumption'] < 0:
        raise ValueError('%s: consumption has negative value %s' %
                         (zone_key, obj['consumption']))


def validate_exchange(item, k):
    if item.get('sortedZoneKeys', None) != k:
        raise Exception("Sorted country codes %s and %s don't match" %
                        (item.get('sortedZoneKeys', None), k))
    if 'datetime' not in item:
        raise Exception('datetime was not returned for %s' % k)
    if type(item['datetime']) != datetime.datetime:
        raise Exception('datetime %s is not valid for %s' %
                        (item['datetime'], k))
    if arrow.get(item['datetime']) > arrow.now():
        raise Exception("Data from %s can't be in the future" % k)
    if arrow.get(item['datetime']).year < 2000:
        raise Exception("Data from %s can't be before year 2000" % k)


def validate_production(obj, zone_key):
    if 'datetime' not in obj:
        raise Exception('datetime was not returned for %s' % zone_key)
    if 'zoneKey' not in obj:
        raise Exception('zoneKey was not returned for %s' % zone_key)
    if type(obj['datetime']) != datetime.datetime:
        raise Exception('datetime %s is not valid for %s' %
                        (obj['datetime'], zone_key))
    if obj.get('zoneKey', None) != zone_key:
        raise Exception("Country codes %s and %s don't match" %
                        (obj.get('zoneKey', None), zone_key))
    if arrow.get(obj['datetime']) > arrow.now():
        raise Exception("Data from %s can't be in the future" % zone_key)
    if (obj.get('production', {}).get('unknown', None) is None and
        obj.get('production', {}).get('coal', None) is None and
        obj.get('production', {}).get('oil', None) is None and
        obj.get('production', {}).get('gas', None) is None and
        zone_key not in ['CH', 'NO', 'AUS-TAS', 'DK-BHM', 'US-NEISO']):
            raise Exception("Coal or oil or unknown production value is "
                            "required for %s" % (zone_key))
    for k, v in obj['production'].items():
        if v is None:
            continue
        if v < 0:
            raise ValueError('%s: key %s has negative value %s' %
                             (zone_key, k, v))
