import axios from "axios";

const API_URL = process.env.VUE_APP_API_URL;

class SolverService {
  solve(bin, box) {
    var data = { bin, box };
    var url = API_URL + "mplp";
    return axios.post(url, data).then(response => {
      return response.data || [];
    });
  }
}

export default new SolverService();
