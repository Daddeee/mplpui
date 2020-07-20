<template>
  <v-container fluid fill-height>
    <v-row>
      <v-col :cols="3">
        <v-form>
          <v-select label="Pallet" v-model="bin" :items="pallets"></v-select>
          <v-row>
            <v-col>
              <v-text-field
                v-model.number="bin.w"
                label="Lunghezza massima pallet"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="bin.d"
                label="Larghezza massima pallet"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="bin.h"
                label="Altezza massima pallet"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                v-model.number="box.w"
                label="Lunghezza pacco"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="box.d"
                label="Larghezza pacco"
              ></v-text-field>
            </v-col>
            <v-col>
              <v-text-field
                v-model.number="box.h"
                label="Altezza pacco"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-checkbox
                v-model="conf.flipLayers"
                class="mx-2"
                label="Incrocia strati"
              ></v-checkbox>
            </v-col>
            <v-col>
              <v-checkbox
                v-model="conf.verticalBoxes"
                class="mx-2"
                label="Scatole verticali"
              ></v-checkbox>
            </v-col>
          </v-row>
          <v-row>
            <v-col :cols="6" justify="center" align="center">
              <v-btn color="success" @click="solve()">
                Calcola
              </v-btn>
            </v-col>
            <v-col :cols="6" justify="center" align="center">
              <v-btn color="red" @click="exit()">
                Esci
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-progress-linear
              v-if="loading"
              indeterminate
              color="cyan"
            ></v-progress-linear>
          </v-row>
        </v-form>
        <br />
        <v-divider></v-divider>
        <br />
        <v-form v-if="response != null">
          <v-text-field
            :value="response.boxesVolume / 1e9 + ' m³'"
            label="Volume pacchi:"
            readonly
          ></v-text-field>
          <v-text-field
            :value="response.numBoxes"
            label="Numero pacchi:"
            readonly
          ></v-text-field>
          <v-text-field
            :value="response.fillRatio"
            label="Rapporto volume:"
            readonly
          ></v-text-field>
          <v-layout row justify-center>
            <v-dialog v-model="dialog" persistent max-width="600px">
              <template v-slot:activator="{ on }">
                <v-btn color="primary" dark v-on="on">Completa</v-btn>
              </template>
              <v-card>
                <v-card-title>
                  <span class="headline">Dati disposizione</span>
                </v-card-title>
                <v-card-text>
                  <v-container grid-list-md>
                    <v-layout wrap>
                      <v-flex xs12>
                        <v-text-field
                          label="Codice Imballo"
                          required
                          v-model="code"
                        ></v-text-field>
                      </v-flex>
                      <v-flex xs12>
                        <v-text-field
                          label="Impulso per centrare ribaltatore"
                          required
                          v-model="impulse"
                        ></v-text-field>
                      </v-flex>
                      <v-flex xs12>
                        <v-select
                          v-model="inter"
                          :items="layersIdxs"
                          label="Interfalde"
                          hint="Seleziona gli strati sotto a cui posizionare un'interfalda."
                          multiple
                          persistent-hint
                        ></v-select>
                      </v-flex>
                      <v-flex xs12>
                        <v-checkbox
                          v-model="excludeVertical"
                          class="mx-2"
                          label="Escludi scatole verticali"
                        ></v-checkbox>
                      </v-flex>
                    </v-layout>
                  </v-container>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="blue darken-1" text @click="dialog = false">
                    Chiudi
                  </v-btn>
                  <v-btn color="blue darken-1" text @click="download()">
                    Download
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-layout>
        </v-form>
      </v-col>
      <v-col :cols="9">
        <Scene>
          <DirectionalLight :direction="[0, -1, 0]"></DirectionalLight>
          <DirectionalLight :direction="[1, 0, 1]"></DirectionalLight>
          <DirectionalLight :direction="[-1, 0, -1]"></DirectionalLight>
          <Camera
            v-if="bin != null"
            type="arcRotate"
            :alpha="0"
            :beta="Math.PI / 4"
            :target="[0, 0, 0]"
            :radius="bin.h / 5"
          ></Camera>
          <Ground
            v-if="bin != null"
            :key="bin.id"
            :position="[0, -bin.h / 20, 0]"
            :options="{ width: bin.w / 10, height: bin.d / 10 }"
          >
            <Material diffuse="#EEE"></Material>
          </Ground>
          <Box
            v-for="p in packs"
            :key="p.box.id"
            :position="p.point"
            :options="p.box"
            @complete="drawEdges"
          >
            <Material diffuse="#88FF88"></Material>
          </Box>
        </Scene>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import SolverService from "@/services/solver.service.js";
import PALLETS from "@/services/pallets.service.js";

export default {
  name: "Home",
  data() {
    return {
      testbox: null,
      bin: PALLETS[3].value,
      box: {
        w: 100,
        d: 100,
        h: 100,
        id: "box"
      },
      conf: {
        flipLayers: false,
        verticalBoxes: true
      },
      response: null,
      packs: [],
      pointsLayers: {},
      rotationsLayers: {},
      pallets: PALLETS,
      renderDelay: 500,
      loading: false,
      dialog: false,
      excludeVertical: false,
      externalLowestX: true,
      externalLowestY: true,
      // complete data
      code: null,
      impulse: 10,
      plcNumber: 1,
      inter: []
    };
  },
  computed: {
    programName() {
      var name =
        this.code +
        "-" +
        this.bin.w +
        "x" +
        this.bin.d +
        "x" +
        this.bin.h +
        "-" +
        this.response.numBoxes;

      var flags = "";
      if (this.conf.flipLayers) flags += "I";
      if (this.conf.verticalBoxes) flags += "V";
      if (flags.length > 0) name += "-" + flags;
      
      return name;
    },
    layersZs() {
      return Object.keys(this.pointsLayers)
        .map(i => parseInt(i))
        .sort((a, b) => a - b);
    },
    layersIdxs() {
      return this.layersZs.map((z, i) => i + 1);
    },
    numLayers() {
      return this.layersIdxs.length;
    },
    layersHeights() {
      var zs = this.layersZs;
      var prevZ = 0;
      var heights = [];
      for (var i = 0; i < zs.length; i++) {
        // layers have constant height so no matter which rotation i pick
        var rotated = this.rotate(this.box, this.rotationsLayers[zs[i]][0]);
        var z = prevZ + rotated.h;
        heights.push(z);
        prevZ = z;
      }
      return heights;
    },
    deposits() {
      var deposits = [];

      for (var j = 0; j < this.layersZs.length; j++) {
        var points = this.pointsLayers[this.layersZs[j]];
        var rotations = this.rotationsLayers[this.layersZs[j]];
        var centers = [];
        var vertical = [];
        var bounds = {
          xmin: this.bin.w,
          xmax: 0,
          ymin: this.bin.d,
          ymax: 0,
          zmin: this.bin.h,
          zmax: 0
        };
        for (var i = 0; i < points.length; i++) {
          var isVertical = rotations[i] != "WDH" && rotations[i] != "DWH";
          if (isVertical && this.excludeVertical)
            continue;
          vertical.push(isVertical);


          var rotated = this.rotate(this.box, rotations[i]);
          centers.push({
            x: points[i].x + Math.floor(rotated.w / 2),
            y: points[i].y + Math.floor(rotated.d / 2),
            z: points[i].z + Math.floor(rotated.h / 2)
          });

          bounds.xmin = (bounds.xmin > points[i].x) ? points[i].x : bounds.xmin;
          bounds.ymin = (bounds.ymin > points[i].y) ? points[i].y : bounds.ymin;
          bounds.zmin = (bounds.zmin > points[i].z) ? points[i].z : bounds.zmin;
          bounds.xmax = (bounds.xmax < points[i].x + rotated.w) ? points[i].x + rotated.w : bounds.xmax;
          bounds.ymax = (bounds.ymax < points[i].y + rotated.d) ? points[i].y + rotated.d : bounds.ymax;
          bounds.zmax = (bounds.zmax < points[i].z + rotated.h) ? points[i].z + rotated.h : bounds.zmax;
        }

        // argsort with dsu
        var sortedIdxs = centers
          .map((c, index) => [c, index])
          .sort((arr1, arr2) => {
            var d1 = arr1[0].x*arr1[0].x + arr1[0].y*arr1[0].y;
            var d2 = arr2[0].x*arr2[0].x + arr2[0].y*arr2[0].y; 
            return d1 - d2;
          })
          .map(arr => arr[1]);

        for (i = 0; i < sortedIdxs.length; i++) {
          var idx = sortedIdxs[i];
          deposits.push({
            QUOTA_X: centers[idx].x,
            QUOTA_Y: centers[idx].y,
            QUOTA_W: this.getRotationInDegrees(
              bounds,
              centers[idx],
              this.box,
              rotations[idx]
            ),
            QUOTA_Z: vertical[idx] ? 2*centers[idx].z : centers[idx].z,
            ACC_XP: true,
            ACC_XN: false,
            ACC_YP: true,
            ACC_YN: false,
            ACC_ZP: false,
            CAMBIO_STRATO: i == sortedIdxs.length - 1,
            SCARICO_DA_ALTO: false,
            TEST_ALTEZZA_SCARICO: false,
            SCATOLA_VERTICALE: vertical[idx]
          });
        }
      }
      return deposits;
    }
  },
  methods: {
    drawEdges(complete) {
      complete.entity.enableEdgesRendering();
      complete.entity.edgesWidth = 100.0;
      complete.entity.edgesColor = new this.BABYLON.Color4(0, 0, 0, 1);
    },
    rotate(box, rotation) {
      switch (rotation) {
        case "WDH":
          return { w: box.w, d: box.d, h: box.h, id: box.id };
        case "WHD":
          return { w: box.w, d: box.h, h: box.d, id: box.id };
        case "DWH":
          return { w: box.d, d: box.w, h: box.h, id: box.id };
        case "DHW":
          return { w: box.d, d: box.h, h: box.w, id: box.id };
        case "HWD":
          return { w: box.h, d: box.w, h: box.d, id: box.id };
        case "HDW":
          return { w: box.h, d: box.d, h: box.w, id: box.id };
        default:
          return null;
      }
    },
    getRotationInDegrees(bounds, center, box, rotation) {
      var rot = 0;
      var rotated = this.rotate(box, rotation);
      switch (rotation) {
        case "WDH":
          rot = (center.y + Math.ceil(rotated.d / 2) >= bounds.ymax) ? -90 : 90;
          break;
        case "WHD":
          rot = 90;
          break;
        case "DWH":
          rot = (center.x + Math.ceil(rotated.w / 2) >= bounds.xmax) ? 180 : 0;
          break;
        case "DHW":
          rot = 90;
          break;
        case "HWD":
          rot = 90;
          break;
        case "HDW":
          rot = 0;
          break;
        default:
          return null;
      }
      return rot;
    },
    shift(point, box, bin) {
      return [
        point.x + (box.w - bin.w) / 2,
        point.z + (box.h - bin.h) / 2,
        point.y + (box.d - bin.d) / 2
      ];
    },
    parsePack(bin, box, point, rotation) {
      let b = this.rotate(box, rotation);
      let p = this.shift(point, b, bin);
      return {
        box: this.getOptions(b),
        point: p,
        color: this.getRandomColor()
      };
    },
    getOptions(p) {
      return { width: p.w, depth: p.d, height: p.h, id: p.id };
    },
    scale(obj) {
      const scalingFactor = 10;
      let k = Object.keys(obj);
      let res = {};
      for (let i = 0; i < k.length; i++) {
        res[k[i]] = Number.isInteger(obj[k[i]])
          ? obj[k[i]] / scalingFactor
          : obj[k[i]];
      }
      return res;
    },
    solve() {
      let that = this;
      this.loading = true;
      SolverService.solve(this.bin, this.box, this.conf).then(response => {
        that.loading = false;
        that.response = response;
        that.packs = [];
        var pointsLayers = {};
        var rotationsLayers = {};
        for (let i = 0; i < response.points.length; i++) {
          let p = response.points[i];
          if (pointsLayers[p.z] == null) {
            pointsLayers[p.z] = [];
            rotationsLayers[p.z] = [];
          }
          pointsLayers[p.z].push(response.points[i]);
          rotationsLayers[p.z].push(response.rotations[i]);
        }

        that.pointsLayers = pointsLayers;
        that.rotationsLayers = rotationsLayers;

        let layers = that.layersZs;
        for (let j = 0; j < layers.length; j++) {
          let k = layers[j];
          setTimeout(
            () =>
              that.drawLayer(
                response.bin,
                response.box,
                that.pointsLayers[k],
                that.rotationsLayers[k],
                j
              ),
            that.renderDelay * j
          );
        }
      });
    },
    drawLayer(bin, box, points, rotations, layerNo) {
      var packs = [];
      bin = this.scale(bin);
      box = this.scale(box);
      for (let i = 0; i < points.length; i++) {
        var point = this.scale(points[i]);
        var rotation = rotations[i];
        packs[i] = this.parsePack(bin, box, point, rotation);
        packs[i].box.id += i;
        packs[i].box.id += "-";
        packs[i].box.id += layerNo; // z different between layers
      }
      this.packs.push(...packs);
    },
    getRandomColor() {
      var letters = "0123456789ABCDEF";
      var color = "#";
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    },
    exit() {
      if (confirm("Sei sicuro di uscire?")) {
        SolverService.stop().then(() => {
          alert("Il programma è stato arrestato. Chiudere la pagina.");
        });
      }
    },
    getProgramJson() {
      var boolInter = new Array(this.numLayers).fill(0);
      this.inter.forEach(i => {
        boolInter[i - 1] = 1;
      });

      return {
        NOME_PRG: this.programName,
        IMP_CENT_RIB: this.impulse,
        PLC_NUMBER: 1,
        QUOTA_X_PRESA: 0,
        QUOTA_Y_PRESA: Math.floor(-this.box.w / 2),
        QUOTA_Z_PRESA: this.box.h,
        QUOTA_Z_PRESA_VERTICALE: this.box.d,
        QUOTA_W_PRESA: 0,
        K_ACC_X: 40,
        K_ACC_Y: 40,
        K_ACC_Z: 40,
        NUM_STRATI: this.numLayers,
        QUOTA_X_D_INTER: 0,
        QUOTA_Y_D_INTER: 0,
        QUOTA_W_D_INTER: 90,
        ALTEZZA: this.layersHeights,
        INTER: boolInter,
        DEPOSITO: this.deposits
      };
    },
    download() {
      this.dialog = false;
      var data = JSON.stringify(this.getProgramJson());
      var blob = new Blob([data], { type: "text/plain" });
      var e = document.createEvent("MouseEvents"),
        a = document.createElement("a");
      a.download = this.programName + ".json";
      a.href = window.URL.createObjectURL(blob);
      a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
      e.initEvent(
        "click",
        true,
        false,
        window,
        0,
        0,
        0,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null
      );
      a.dispatchEvent(e);
    }
  }
};
</script>
