import json
import arrow
import os
import pandas as pd
import requests
import datetime 
import time

from io import StringIO
from dateutil import tz

APG_API_BASE="https://transparency.apg.at/transparency-api/api/v1"
EXCHANGE_API="{}/Download/CBPF/German/M15".format(APG_API_BASE)

# column names
COL_FROM="Zeit von [CET/CEST]"
COL_TO="Zeit bis [CET/CEST]"
COL_CZ_AT="CZ>AT Leistung [MW]"
COL_HU_AT="HU>AT Leistung [MW]"
COL_SI_AT="SI>AT Leistung [MW]"
COL_IT_AT="IT>AT Leistung [MW]"
COL_CH_AT="CH>AT Leistung [MW]"
COL_DE_AT="DE>AT Leistung [MW]"
EXCHANGE_COLS = [COL_CZ_AT, COL_HU_AT, COL_SI_AT, COL_IT_AT, COL_CH_AT, COL_DE_AT]

# for each interconnector a function which retrieves the desired value from a dict or Series
# when the direction changes, we need to multiply by -1
EXCHANGES = {"AT->CH": lambda d: -1 * d[COL_CH_AT],
             "AT->CZ": lambda d: -1 * d[COL_CZ_AT],
             "AT->DE": lambda d: -1 * d[COL_DE_AT],
             "AT->IT": lambda d: -1 * d[COL_IT_AT],
             "AT->HU": lambda d: -1 * d[COL_HU_AT],
             "AT->SI": lambda d: -1 * d[COL_SI_AT],}


def format_date(date):
    """
    Format a date as expected by the APG api
    Return: the date object as formatted string
    """
    return "{}T000000".format(date.isoformat())


def fetch_exchange(zone_key1, zone_key2, session=None, target_datetime=None, logger=None):
    exchange = '->'.join(sorted([zone_key1, zone_key2]))
    if exchange not in EXCHANGES:
        raise ValueError("The requested exchange {} is not supported by the AT parser".format(exchange))

    if target_datetime is None:
        date = datetime.date.today()
    else:
        date = target_datetime.date()

    # TODO do we really need to fetch the document for each and every interconnector separately?
    exchange_data_of_day = fetch_exchanges_for_date(date, session=session).dropna()

    data = []
    for label, row in exchange_data_of_day.iterrows():
        flow = EXCHANGES[exchange](row)
        end_time = arrow.get(row[COL_TO], tz.gettz('Europe/Vienna'))
        row_data = {'sortedZoneKeys': exchange,
                    'datetime': end_time.datetime,
                    'netFlow': flow,
                    'source': 'transparency.apg.at'}
        data.append(row_data)

    return data


def fetch_exchanges_for_date(date, session=None):
    """
    Fetches all Austrian exchanges for a given date.
    Return: the exchange values of the requested day as a pandas DataFrame 
    """
    # build the request url
    from_date = format_date(date)
    to_date = format_date(date + datetime.timedelta(days=1))
    export_request_url = "{}/{}/{}".format(EXCHANGE_API, from_date, to_date)

    s = session or requests.Session()

    # perform the request which creates the export file
    resp = s.get(export_request_url)
    resp.raise_for_status()

    try:
        export_url_response = resp.json()["ResponseData"]
        cache_id = export_url_response["Cache_ID"]
        filename = export_url_response["FileName"]
    except:
        raise ValueError("The response to the request for generating the csv file has an unexpected format.")

    # fetch the csv file which was created by the previous request
    csv_url = "{}/{}/{}".format(export_request_url, cache_id, filename)
    csv_response = s.get(csv_url)
    csv_response.raise_for_status()

    # override encoding by real educated guess as provided by chardet
    csv_response.encoding = csv_response.apparent_encoding
    csv_str = csv_response.text

    try:
        csv_data = pd.read_csv(StringIO(csv_str), delimiter=";", parse_dates=[COL_FROM, COL_TO], dayfirst=True)
    except:
        raise ValueError("The downloaded csv file has an unexpected format")

    # parse float values (AT locale uses ',' instead of '.')
    csv_data[EXCHANGE_COLS] = csv_data[EXCHANGE_COLS].replace(to_replace=",", value='.', regex=True).apply(pd.to_numeric)

    return csv_data


def check_delay():
    while True:
        # run at every full minute
        now = arrow.utcnow()
        sleep_time = (now.ceil('minute') - now).seconds + 1
        if sleep_time > 0:
            time.sleep(sleep_time)

        try:
            exchange_data = fetch_exchanges_for_date(datetime.date.today())

            last_row = exchange_data.dropna().iloc[-1]
            end_date = last_row[COL_TO]

            if end_date.isoformat() not in STORAGE:
                delta = datetime.datetime.now() - end_date
                last_row["Delay [Minutes]"] = delta.seconds / 60
                STORAGE[end_date.isoformat()] = last_row.astype(str).to_dict()
                print("Encountered new exchange data with delay {}".format(delta))
            else:
               print("No new data is available")

            with open(STORAGE_FILE, "w") as f:
                json.dump(STORAGE, f)
        except Exception as e:
            print("An error occurred while checking the delay: {}".format(e))


STORAGE = {}
STORAGE_FILE = "delay_storage.json"



if __name__ == "__main__":
    print("Fetching exchange AT->DE")
    print(fetch_exchange("AT", "DE"))
    print("Fetching exchange AT->DE for 2013-01-01")
    print(fetch_exchange("AT", "DE", target_datetime=datetime.datetime(year=2013, month=1, day=1)))
