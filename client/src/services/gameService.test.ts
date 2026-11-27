import axios from 'axios';
import {
  createDuelDraw,
  createFinaleDraw,
  createSoloMatch,
  fetchDuelDraw,
  fetchFinaleSolutions,
  fetchNumbersSolutions,
  fetchSoloMatch,
  fetchLettersDraw,
  nextSoloRound,
  skipFinaleWord,
  validateDuelAnswer,
  validateFinaleWord,
  validateLettersWord,
  validateNumbersAnswer
} from './gameService';

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() }
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => jest.clearAllMocks());

test('sends number and letter round requests with their payloads', async () => {
  mockedAxios.post.mockResolvedValue({ data: { drawId: 'draw' } });
  mockedAxios.get.mockResolvedValue({ data: {} });

  await fetchLettersDraw(['vowel'], 'pt');
  await validateLettersWord('draw/id', 'palavra');
  await validateNumbersAnswer('number/id', '(10 + 5) * 8');
  await fetchNumbersSolutions('number/id');

  expect(mockedAxios.post).toHaveBeenNthCalledWith(1, expect.stringContaining('/letters/draw'), {
    choices: ['vowel'], language: 'pt'
  });
  expect(mockedAxios.post).toHaveBeenNthCalledWith(2, expect.stringContaining('/letters/validate'), {
    drawId: 'draw/id', word: 'palavra'
  });
  expect(mockedAxios.post).toHaveBeenNthCalledWith(3, expect.stringContaining('/numbers/validate'), {
    drawId: 'number/id', expression: '(10 + 5) * 8'
  });
  expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/numbers/number%2Fid/solutions'));
});

test('encodes solo, duel and finale identifiers and forwards answers', async () => {
  mockedAxios.get.mockResolvedValue({ data: {} });
  mockedAxios.post.mockResolvedValue({ data: {} });

  await createSoloMatch('fr', 2);
  await fetchSoloMatch('match/id');
  await nextSoloRound('match/id');
  await createDuelDraw('mental', 'pt');
  await fetchDuelDraw('duel/id');
  await validateDuelAnswer('duel/id', '42');
  await createFinaleDraw('en');
  await validateFinaleWord('final/id', 3, 'abcdefghij');
  await skipFinaleWord('final/id', 3);
  await fetchFinaleSolutions('final/id');

  expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/matches'), {
    language: 'fr', largeCount: 2
  });
  expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/matches/match%2Fid'));
  expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/duels/validate'), {
    drawId: 'duel/id', answer: '42'
  });
  expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/finale/validate'), {
    drawId: 'final/id', index: 3, word: 'abcdefghij'
  });
  expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/finale/final%2Fid/solutions'));
});
