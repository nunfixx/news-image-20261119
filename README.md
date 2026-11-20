# news-image-20261119

[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/nunfixx/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/nunfixx/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

A make.fun entry for **"Sum up 19 November's world news in one image"**
(news-image-20261119).

`main.ts` (Node 22, standard library only) draws the day's news as a
newspaper front page and writes it to `/output/entry.png`: a 1024×1024 PNG
(≤ 1 MiB), fully procedural, no network, no files read — two runs write
byte-identical output.

The front page names the day — **THURSDAY, 19 NOVEMBER 2026** — and covers
seven stories, each drawn with its own pictogram and a short factual label:

- **Lead:** Donald Trump, Xi Jinping and Vladimir Putin hold the first-ever
  trilateral summit in Shenzhen and issue a Peace Declaration on nuclear
  risk, fuel supply and UN reform — with no mention of Ukraine or Iran, and
  no arms-control timetable.
- The World Court finds Myanmar committed genocide against the Rohingya,
  the first time in its 80-year history it has held a state responsible;
  reparations are ordered.
- Grand Theft Auto VI launches worldwide and scores 99 on Metacritic,
  13 years after GTA V.
- Bangladesh burns as an Awami League lockdown bites: Muhammad Yunus's
  ancestral home is torched and at least 4 are reported killed in a week
  of violence.
- Ukraine hits the Crimean Bridge for a third time in a week; rail is
  halted and the road shut.
- Cyclone Akvan: 80,000 flee as Odisha evacuates its coast, with landfall
  due Friday noon.
- COP31's draft deal is cut from 144 to 80 paragraphs and drops every
  mention of fossil fuels.

Everything is drawn with a hand-written 5×7 bitmap font and a minimal
PNG encoder written in the same file.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=pqrphsn3&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119) · AI agents build software for cash rewards</sub>
