import unittest

from requests import Session
from requests_mock import Adapter
from pkg_resources import resource_string
from parsers import IN_PB
from arrow import get
from datetime import datetime


class TestINPB(unittest.TestCase):

    def setUp(self):
        self.session = Session()
        self.adapter = Adapter()
        self.session.mount('http://', self.adapter)

    def test_read_punjab_consumption_date(self):
        current = get(datetime(2017, 11, 18, 20, 35, 20), 'Asia/Kolkata')
        expected = get(datetime(2017, 11, 18, 20, 35, 15), 'Asia/Kolkata')
        result = IN_PB.read_punjab_consumption_date("18/11/2017", "20:35:15", current)
        self.assertEqual(expected, result)
        result = IN_PB.read_punjab_consumption_date("11/18/2017", "20:35:15", current)
        self.assertEqual(expected, result)

        current = get(datetime(2017, 10, 9, 15, 35, 20), 'Asia/Kolkata')
        expected = get(datetime(2017, 10, 9, 15, 35, 15), 'Asia/Kolkata')
        result = IN_PB.read_punjab_consumption_date("10/09/2017", "15:35:15", current)
        self.assertEqual(expected, result)

    def test_fetch_consumption(self):
        response_text = resource_string("parsers.test.mocks", "IN_PB_nrGenReal.html")
        self.adapter.register_uri("GET", "http://www.punjabsldc.org/nrrealw.asp?pg=nrGenReal",
                                  content=response_text)
        try:
            data = IN_PB.fetch_consumption('IN-PB', self.session)
            self.assertIsNotNone(data)
            self.assertEqual(data['countryCode'], 'IN-PB')
            self.assertEqual(data['source'], 'punjasldc.org')
            self.assertIsNotNone(data['datetime'])
            expected = get(datetime(2017, 9, 6, 14, 38, 29), 'Asia/Kolkata').datetime
            date_time = data['datetime']
            self.assertEquals(date_time, expected)
            self.assertIsNotNone(data['consumption'])
            self.assertEqual(data['consumption'], 7451.0)
        except Exception as ex:
            self.fail("IN_KA.fetch_consumption() raised Exception: {0}".format(ex.message))

    def test_fetch_production(self):
        response_text = resource_string("parsers.test.mocks", "IN_PB_pbGenReal.html")
        self.adapter.register_uri("GET", "http://www.punjabsldc.org/pungenrealw.asp?pg=pbGenReal",
                                  content=response_text)
        try:
            data = IN_PB.fetch_production('IN-PB', self.session)
            self.assertIsNotNone(data)
            self.assertEqual(data['countryCode'], 'IN-PB')
            self.assertEqual(data['source'], 'punjasldc.org')
            self.assertIsNotNone(data['datetime'])
            self.assertIsNotNone(data['production'])
            self.assertEqual(data['production']['hydro'], 554.0)
            self.assertIsNotNone(data['storage'])
        except Exception as ex:
            self.fail("IN_PB.fetch_production() raised Exception: {0}".format(ex.message))

    def test_read_text_by_regex(self):
        text ='<b><font size="4">&nbsp;09/06/2017</b></font>'
        date_text = IN_PB.read_text_by_regex('(\d+/\d+/\d+)', text)
        expected = "09/06/2017"
        self.assertEquals(date_text, expected)

        text = '<b>Time :&nbsp;14:38:29</b>'
        date_text = IN_PB.read_text_by_regex('(\d+:\d+:\d+)', text)
        expected = "14:38:29"
        self.assertEquals(date_text, expected)

        text = '<b>&nbsp;&nbsp; Last Updated at&nbsp; 13:33:59</b><br>'
        date_text = IN_PB.read_text_by_regex('(\d+:\d+:\d+)', text)
        expected = "13:33:59"
        self.assertEquals(date_text, expected)


if __name__ == '__main__':
    unittest.main()
