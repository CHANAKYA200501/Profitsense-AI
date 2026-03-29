import requests
import feedparser

headers = {'User-Agent': 'Mozilla/5.0'}
url = 'https://economictimes.indiatimes.com/markets/rss.cms'
r = requests.get(url, headers=headers)
feed = feedparser.parse(r.content)
print("Entries:", len(feed.entries))
print(feed.entries[0].title if feed.entries else "None")
