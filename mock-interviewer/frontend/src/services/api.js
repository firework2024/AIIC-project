import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "/api";

export const fetchTopics = () =>
  axios.get(`${API}/topics`);

export const startInterview = (formData) =>
  axios.post(`${API}/interview/start`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const submitAnswer = (payload) =>
  axios.post(`${API}/interview/answer`, payload);

export const clarifyQuestion = (payload) =>
  axios.post(`${API}/interview/clarify`, payload);

export const transcribeAudio = (formData) =>
  axios.post(`${API}/interview/transcribe`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const downloadReportPdf = (report) =>
  axios.post(
    `${API}/interview/report/pdf`,
    { report },
    { responseType: "blob" }
  );
