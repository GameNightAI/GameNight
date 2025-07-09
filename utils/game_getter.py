import csv
import urllib.request
import urllib.error
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import itertools
import time
import string
# from optparse import OptionParser

CSV_URL = 'https://boardgamegeek.com/data_dumps/bg_ranks'
INPUT_PATH = 'boardgames_ranks.csv'
OUTPUT_PATH = 'output.csv'
SLEEP_TIME = 10 # seconds to wait after receiving a urllib.request error
DASH = '–' # NOT the hyphen character on the keyboard
DESCRIPTION_NCHARS = 100 # number of description characters to store in the output, since we currently have a database size limit
INCLUDE_BGG_TAXONOMY = False
TAXONOMY_DELIMITER = '|'

def get_zip_url():
  response = urllib.request.urlopen(CSV_URL)
  soup = BeautifulSoup(response.read(), 'lxml')
  

def has_taxonomy(item, type, value):
  return any(link.attrib['type'] == type and link.attrib['value'] == value for link in item.findall('link'))

def parse_xml(text):
  root = ET.fromstring(text)
  for item in root:
    for poll in item.findall('poll'):
      if poll.attrib['name'] == 'suggested_playerage':
        # Avoid division by zero
        if poll.attrib['totalvotes'] == '0':
          suggested_playerage = ''
        else:
          votesum = 0
          agesum = 0
          for result in poll.find('results').findall('result'):
            age = int(''.join(char for char in result.attrib['value'] if char in string.digits)) # parse "21" from "21 and up"
            numvotes = int(result.attrib['numvotes'])
            agesum += age * numvotes
            votesum += numvotes
          suggested_playerage = agesum / votesum # weighted average
    for summary in item.findall('poll-summary'):
      if summary.attrib['name'] == 'suggested_numplayers':
        for result in summary.findall('result'):
          if result.attrib['name'] == 'bestwith':
            best_players = ''.join(char for char in result.attrib['value'] if char in (string.digits + DASH + ',+')).replace(DASH, '-')
          elif result.attrib['name'] == 'recommmendedwith':
            rec_players = ''.join(char for char in result.attrib['value'] if char in (string.digits + DASH + ',+')).replace(DASH, '-')
            
    row = dict(
      id = item.attrib['id'],
      minplaytime = item.find('minplaytime').attrib['value'],
      maxplaytime = item.find('maxplaytime').attrib['value'],
      min_players = item.find('minplayers').attrib['value'],
      max_players = item.find('maxplayers').attrib['value'],
      best_players = best_players,
      rec_players = rec_players,
      image_url = item.findtext('image', default=''),
      thumbnail = item.findtext('thumbnail', default=''),
      # NULL out complexity=0 for filtering purposes, and in case we ever decide to do some math (0 means no votes)
      complexity = float(item.find('statistics').find('ratings').find('averageweight').attrib['value']) or '',
      description = item.findtext('description', default='')[:DESCRIPTION_NCHARS],
      is_cooperative = has_taxonomy(item, 'boardgamemechanic', 'Cooperative Game'),
      is_teambased = has_taxonomy(item, 'boardgamemechanic', 'Team-Based Game'),
      is_legacy = has_taxonomy(item, 'boardgamemechanic', 'Legacy Game'),
      min_age = item.find('minage').attrib['value'],
      suggested_playerage = suggested_playerage
    )
    
    if INCLUDE_BGG_TAXONOMY:
      for type in ['boardgamecategory', 'boardgamemechanic', 'boardgamefamily']:
        row[type] = TAXONOMY_DELIMITER.join(link.attrib['value'] for link in item.findall('link') if link.attrib['type'] == type)
    
    yield row

def urllib_error_handler(err):
  print(err)
  print(f'Waiting {SLEEP_TIME} seconds before resubmitting request...')
  time.sleep(SLEEP_TIME)

def main():
  
  # parser = OptionParser()
  # parser.add_option()

  reader = csv.DictReader(open(INPUT_PATH, 'r', encoding='utf-8'))
  writer = csv.DictWriter(open(OUTPUT_PATH, 'w', encoding='utf-8', newline=''), fieldnames=reader.fieldnames)
  writer.writeheader()
  
  # Make API calls in batches of 20 items at a time
  for batch in itertools.batched(reader, 20):
    items = {}
    for row in batch:
      items[row['id']] = row
      # We want 0 to show up as NULL in the database for sorting/filtering purposes
      for col in ['average', 'bayesaverage', 'rank', 'yearpublished']:
        if row[col] == '0':
          row[col] = ''
    
    ids = ','.join(items.keys())
    url = f'https://boardgamegeek.com/xmlapi2/thing?id={ids}&stats=1'
    
    while 1:
      try:
        response = urllib.request.urlopen(url)
      except urllib.error.HTTPError as err:
        if err.code == 429: # Too many requests
          urllib_error_handler(err)
        else:
          raise
      except urllib.error.URLError as err:
        urllib_error_handler(err)
      else:
        break
    
    for item in parse_xml(response.read()):
      id = item['id']
      items[id].update(item)
      print(items[id])
      writer.writerow(items[id])
if __name__ == '__main__':
  main()
