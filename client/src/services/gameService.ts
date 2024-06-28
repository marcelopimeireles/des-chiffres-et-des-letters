import axios from 'axios';

const API_URL = 'http://localhost:5000/api/game';

export const fetchNumbersGame = async () => {
  const response = await axios.get(`${API_URL}/numbers`);
  return response.data;
};

export const fetchLettersGame = async () => {
  const response = await axios.get(`${API_URL}/letters`);
  return response.data;
};

export const fetchDuel = async () => {
  const response = await axios.get(`${API_URL}/duel`);
  return response.data;
};

export const fetchFinalWords = async () => {
  const response = await axios.get(`${API_URL}/final`);
  return response.data;
};
