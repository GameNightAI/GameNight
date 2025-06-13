import csv
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
import itertools
import time
import string

INPUT_PATH = 'boardgames_ranks.csv'
OUTPUT_PATH = 'output.csv'
SLEEP_TIME = 10 # seconds to wait after receiving a urllib.request error
DASH = '–' # NOT the hyphen character on the keyboard
DESCRIPTION_NCHARS = 100 # number of description characters to store in the output, since we currently have a database size limit

def parse_xml(text):
  root = ET.fromstring(text)
  for item in root:
    for poll in item.findall('poll'):
      if poll.attrib['name'] == 'suggested_playerage':
        if poll.attrib['totalvotes'] == '0': # Avoid division by zero
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
            best_players = ''.join(char for char in result.attrib['value'] if char in (string.digits + DASH + ',+'))
          elif result.attrib['name'] == 'recommmendedwith':
            rec_players = ''.join(char for char in result.attrib['value'] if char in (string.digits + DASH + ',+'))
            
    yield dict(
      id = item.attrib['id'],
      minplaytime = item.find('minplaytime').attrib['value'],
      maxplaytime = item.find('maxplaytime').attrib['value'],
      min_players = item.find('minplayers').attrib['value'],
      max_players = item.find('maxplayers').attrib['value'],
      best_players = best_players,
      rec_players = rec_players,
      image_url = item.findtext('image', default=''),
      complexity = item.find('statistics').find('ratings').find('averageweight').attrib['value'],
      description = item.findtext('description', default='')[:DESCRIPTION_NCHARS],
      is_cooperative = any(link.attrib['type'] == 'boardgamemechanic' and link.attrib['value'] == 'Cooperative Game' for link in item.findall('link')),
      is_teambased = any(link.attrib['type'] == 'boardgamemechanic' and link.attrib['value'] == 'Team-Based Game' for link in item.findall('link')),
      min_age = item.find('minage').attrib['value'],
      suggested_playerage = suggested_playerage
    )

def main():
  reader = csv.DictReader(open(INPUT_PATH, 'r', encoding='utf-8'))
  writer = csv.DictWriter(open(OUTPUT_PATH, 'w', encoding='utf-8', newline=''), fieldnames=reader.fieldnames)
  writer.writeheader()
  
  # Make API calls in batches of 20 items at a time
  for batch in itertools.batched(reader, 20):
    items = {}
    for row in batch:
      items[row['id']] = row
      # We want 0 rank to show up as NULL in the database for sorting purposes
      if row['rank'] == '0':
        row['rank'] = ''
    
    ids = ','.join(items.keys())
    url = f'https://boardgamegeek.com/xmlapi2/thing?id={ids}&stats=1'
    
    while 1:
      try:
        response = urllib.request.urlopen(url)
      except urllib.error.HTTPError as err:
        if err.code == 429: # Too many requests
          print(err)
          print(f'Waiting {SLEEP_TIME} seconds before resubmitting request...')
          time.sleep(SLEEP_TIME)
        else:
          raise
      except urllib.error.URLError as err:
        print(err)
        print(f'Waiting {SLEEP_TIME} seconds before resubmitting request...')
        time.sleep(SLEEP_TIME)
      else:
        break
    
    for item in parse_xml(response.read()):
      items[item['id']].update(item)
      print(items[item['id']])
      writer.writerow(items[item['id']])

if __name__ == '__main__':
  main()
