from requests import Session
from parsers import web
from parsers import countrycode
from parsers import india


def fetch_production(country_code='IN-KA', session=None):
    """Fetch Karnataka  production"""
    countrycode.assert_country_code(country_code, 'IN-KA')

    html = web.get_response_soup(country_code, 'http://kptclsldc.com/StateGen.aspx', session)

    india_date_time = india.read_datetime_from_span_id(html, 'lbldate', 'D/M/YYYY h:mm:ss A')

    # State Production
    state_value = india.read_value_from_span_id(html, 'lblstategen')

    # CGS Production
    cgs_value = india.read_value_from_span_id(html, 'lblcgs')

    # NCEP Production
    ncep_value = india.read_value_from_span_id(html, 'lblncep')

    unknown_value = round(cgs_value + ncep_value + state_value, 2)

    data = {
        'countryCode': country_code,
        'datetime': india_date_time.datetime,
        'production': {
            'biomass': 0.0,
            'coal': 0.0,
            'gas': 0.0,
            'hydro': 0.0,
            'nuclear': 0.0,
            'oil': 0.0,
            'solar': 0.0,
            'wind': 0.0,
            'geothermal': 0.0,
            'unknown': unknown_value
        },
        'storage': {
            'hydro': 0.0
        },
        'source': 'kptclsldc.com',
    }

    return data


if __name__ == '__main__':
    session = Session()
    print fetch_production('IN-KA', session)
