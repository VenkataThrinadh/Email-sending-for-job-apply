import api from './axios';

export const campaignService = {
  getCampaigns: () => api.get('/campaign/list'),
  getCampaign: (id) => api.get(`/campaign/${id}`),
  createCampaign: (data) => api.post('/campaign/create', data),
  deleteCampaign: (id) => api.delete(`/campaign/${id}`),
};
