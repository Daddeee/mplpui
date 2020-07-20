import axios from "axios";

const API_URL = process.env.VUE_APP_API_URL;

class SolverService {
  solve(bin, box, configuration) {
    var data = { bin, box, configuration };
    var url = API_URL + "mplp";
    return axios.post(url, data).then(response => {
      return response.data || [];
    });
  }

  stop() {
    var url = API_URL + "stop";
    return axios.post(url, {}).then(response => {
      return response.data || [];
    });
  }
}

export default new SolverService();
