import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Response interceptor to return data directly
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export const getRisk = async (project: string): Promise<any> => {
  return api.get(`/risk`, { params: { project } });
};

export const getProjects = async (): Promise<any> => {
  return api.get(`/projects`);
};

export const getIngestions = async (): Promise<any> => {
  return api.get(`/ingestions`);
};

export const getNode = async (id: string): Promise<any> => {
  return api.get(`/node/${encodeURIComponent(id)}`);
};

export const ingestFile = async (file: File, project: string): Promise<any> => {
  const formData = new FormData();
  formData.append('dependencyFile', file);
  formData.append('projectName', project);
  
  return api.post(`/ingest`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
