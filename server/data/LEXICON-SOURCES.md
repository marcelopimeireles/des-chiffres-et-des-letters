# Offline word lists: origin, licence, limitations

These UTF-8 plain-text word lists live in `server/data/dictionaries`.
They are separate data assets with their own source terms, **not** an official
competition dictionary. They were filtered to lower-case single Latin-script
words, maximum 10 Unicode characters, deduplicated and sorted, with a few
manually curated common game words added. The code loading the lists is part
of this project's codebase; the upstream data copyright stays with its owners.

## English (`en.txt`) — 4,888 entries

From [MichaelWehar/Public-Domain-Word-Lists](https://github.com/MichaelWehar/Public-Domain-Word-Lists),
commit `e2fe9d32eeb86179b464aba0e91fa96904b8e7e8`.
Inputs: `5000-more-common.txt` and `5664-freq-treegle-may.txt`.
The maintainer explicitly describes these as **public-domain** word lists.
Some individual additional common words were inserted for gameplay.

## Português (`pt.txt`) — 27,266 entries

From [Thanatos995/Public-PT-Domain-Word-Lists](https://github.com/Thanatos995/Public-PT-Domain-Word-Lists),
commit `9d2b9eb4aaad4a8f46139268defc7b4f8a3e9323`.
Inputs: `29458-more-common.txt` and `11961-less-common.txt`.
The repository calls its lists **public domain** and credits the University
of Minho / Projecto Natura for the underlying linguistic work. **Legal
review of the original data provenance is still required before commercial
release**, as the upstream repository's statement does not resolve all
rights in earlier derived resources.

The list contains examples and conjugations used in Portugal and may also
contain names or undesired entries; it is not a curated official pt-PT
competition dictionary. The game uses a single Portuguese language selection, without regional exclusions.

## Français (`fr.txt`) — 11,169 entries

Derived from [Verbarium / Mot Valide — French Word Games](https://github.com/verbarium/french-word-games),
commit `5d43d0c681b1cb6f68ab135448603bab911f0953`.
Inputs: `data/wordle_fr_guesses.csv` (spelling column) and
`data/hangman_words.csv` (word column), plus a few basic French words.
Words were filtered, merged, deduplicated, sorted and limited to 10 characters.

**French list licence: CC BY-SA 4.0.** Credit: Mot Valide (motvalide.fr),
with Lexique 3.83 and wordfreq. Copyright © 2026 Mot Valide and Verbarium.
Their source also credits French Wiktionary contributors and NLP contributors.
Licence: https://creativecommons.org/licenses/by-sa/4.0/
**The French derived data list remains under CC BY-SA 4.0.** This licence
does not turn the unrelated game source code into CC BY-SA 4.0.

## Use and limitations

- The solver returns the best words **within the installed list**, never
  claims they are linguistically optimal for the whole language.
- Accents use unaccented tiles, and the search may match spellings with/without
  accents. This is a gameplay convention, not a full spelling validator.
- Exclusions: punctuation, apostrophes, hyphens, names explicitly written
  with capital letters in source, words over ten characters.
- Names originally written in lower case may remain; dictionary curation
  and authoritative rules are a future step.
- The score of one point per letter is a provisional game rule.
- The files are loaded from the local filesystem at runtime. **Copy
  `server/data/dictionaries` along with `server/dist` when deploying.**
- Editing the language word lists changes the solutions and merits a new
  data version / gameplay regression tests.

If any upstream licence cannot be satisfactorily confirmed for commercial
redistribution, replace the affected asset with a suitably licensed source.

## Inclusive regional vocabulary additions

Manually curated individual common words and spelling variants have been added to all three lists (18 Portuguese, 21 English, 12 French new entries). These are incremental additions, not imported comprehensive regional dictionaries. French QUICK was removed as a game-list correction. The existing source licences remain applicable. Full regional coverage and linguistic review remain outstanding.
