#!/usr/bin/env python3

"""Centralised validation function for all parsers."""

from logging import getLogger


def check_key_is_present(datapoint, key, logger):
    if datapoint['production'].get(key, None) is None:
        logger.warning("Required generation type {} is missing from {}".format(
            key, datapoint['zoneKey']), extra={'key': datapoint['zoneKey']})
        return None
    return True


def check_expected_range(datapoint, value, expected_range, logger, key=None):
    low, high = min(expected_range), max(expected_range)
    if not (low <= value <= high):
        key_str = 'for key `{}`'.format(key) if key else ''
        logger.warning("{} reported total of {:.2f}MW falls outside range "
                       "of {} {}".format(datapoint['zoneKey'], value,
                                         expected_range, key_str),
                       extra={'key': datapoint['zoneKey']})
        return
    return True


def validate(datapoint, logger=getLogger(__name__), **kwargs):
    """
    Validates a production datapoint based on given constraints.
    If the datapoint is found to be invalid then None is returned.

    Arguments
    ---------
    logger
    datapoint: a production datapoint. See examples
    optional keyword arguments
      remove_negative: bool
        Changes negative production values to None.
        Defaults to False.
      required: list
        Generation types that must be present.
        For example ['gas', 'hydro']
        If any of these types are None the datapoint will be invalidated.
        Defaults to an empty list.
      floor: float
        Checks production sum is above floor value.
        If this is not the case the datapoint is invalidated.
        Defaults to None
      expected_range: tuple or dict
        Checks production total against expected range.
        Tuple is in form (low threshold, high threshold), e.g. (1800, 12000).
        If a dict, it should be in the form
        {
          'nuclear': (low, high),
          'coal': (low, high),
        }
        All keys will be required.
        If the total is outside this range the datapoint will be invalidated.
        Defaults to None.

    Examples
    --------
    >>> test_datapoint = {
    >>>   'zoneKey': 'FR',
    >>>   'datetime': '2017-01-01T00:00:00Z',
    >>>       'production': {
    >>>           'biomass': 50.0,
    >>>           'coal': 478.0,
    >>>           'gas': 902.7,
    >>>           'hydro': 190.1,
    >>>           'nuclear': None,
    >>>           'oil': 0.0,
    >>>           'solar': 20.0,
    >>>           'wind': 40.0,
    >>>           'geothermal': 0.0,
    >>>           'unknown': 6.0
    >>>       },
    >>>       'storage': {
    >>>           'hydro': -10.0,
    >>>       },
    >>>       'source': 'mysource.com'
    >>> }

    >>> validate(datapoint, required=['gas'], expected_range=(100, 2000))
    datapoint
    >>> validate(datapoint, required=['not_a_production_type'])
    None
    >>> validate(datapoint, required=['gas'],
    >>>          expected_range={'solar': (0, 1000), 'wind': (100, 2000)})
    datapoint
    """

    remove_negative = kwargs.pop('remove_negative', False)
    required = kwargs.pop('required', [])
    floor = kwargs.pop('floor', False)
    expected_range = kwargs.pop('expected_range', None)
    if kwargs:
        raise TypeError('Unexpected **kwargs: %r' % kwargs)

    generation = datapoint['production']

    if remove_negative:
        for key, val in generation.items():
            if val is not None and -5.0 < val < 0.0:
                logger.warning("{} returned {:.2f}, setting to None".format(
                    key, val), extra={'key': datapoint['zoneKey']})
                generation[key] = None

    if required:
        for item in required:
            if not check_key_is_present(datapoint, item, logger):
                return

    if floor:
        total = sum(v for k, v in generation.items() if v is not None)
        if total < floor:
            logger.warning("{} reported total of {}MW does not meet {}MW floor"
                           " value".format(datapoint['zoneKey'], total, floor),
                           extra={'key': datapoint['zoneKey']})
            return

    if expected_range:
        if isinstance(expected_range, dict):
            for key, range_ in expected_range.items():
                if not check_key_is_present(datapoint, key, logger):
                    return
                if not check_expected_range(datapoint, generation[key], range_,
                                            logger, key=key):
                    return
        else:
            total = sum(v for k, v in generation.items() if v is not None)
            if not check_expected_range(datapoint, total, expected_range,
                                        logger):
                return

    return datapoint


test_datapoint = {
    'zoneKey': 'FR',
    'datetime': '2017-01-01T00:00:00Z',
    'production': {
        'biomass': 50.0,
        'coal': 478.0,
        'gas': 902.7,
        'hydro': 190.1,
        'nuclear': None,
        'oil': 0.0,
        'solar': 20.0,
        'wind': 40.0,
        'geothermal': -1.0,
        'unknown': 6.0
    },
    'storage': {
        'hydro': -10.0,
    },
    'source': 'mysource.com'
}

if __name__ == '__main__':
    print(validate(test_datapoint, required=['gas'],
                   expected_range=(100, 2000), remove_negative=True))
