from setuptools import setup, find_packages

setup(
    description='Electricity Map parsers',
    url='http://https://github.com/tmrowco/electricitymap-contrib',
    install_requires=[
        "arrow==0.16.0",
        "beautifulsoup4==4.6.0",
        "click==6.7",
        "demjson==2.2.4",
        "eiapy==0.1.4",
        "freezegun==0.3.15",
        "html5lib==0.999999999",
        "imageio==2.8.0",
        "lxml==4.4.1",
        "mock==2.0.0",
        "opencv-python==4.2.0.32",
        "pandas==0.23.4",
        "Pillow==6.2.0",
        "pytesseract==0.2.0",
        "ree==2.2.1",
        "requests-mock==1.3.0",
        "requests==2.20.1",
        "signalr-client-threads==0.0.12",
        "tablib==0.12.1",
        "testfixtures==6.0.0",
        "xlrd==1.1.0",
        "xmltodict>=0.12.0",
    ],
    packages=find_packages(),
    entry_points={
        'console_scripts': ['test-parser=parsers.test_parser:test_parser']
    },
    name='parsers',
)
