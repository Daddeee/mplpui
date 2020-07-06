<template>
  <v-container>
    <v-row>
      <v-col :cols="2">
        <v-form>
          <v-select label="Pallet" v-model="bin" :items="pallets"></v-select>
          <v-text-field
            v-model.number="box.w"
            label="Lunghezza pacco"
          ></v-text-field>
          <v-text-field
            v-model.number="box.d"
            label="Larghezza pacco"
          ></v-text-field>
          <v-text-field
            v-model.number="box.h"
            label="Altezza pacco"
          ></v-text-field>
          <v-btn color="success" @click="solve()">
            Calcola
          </v-btn>
        </v-form>
      </v-col>
      <v-col :cols="10">
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
      response: null,
      packs: [],
      pallets: PALLETS,
      render_delay: 500
    };
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
      return { box: this.getOptions(b), point: p, color: this.getRandomColor() };
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
      SolverService.solve(this.bin, this.box).then(response => {
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

        let layers = Object.keys(pointsLayers);
        for (let j = 0; j < layers.length; j++) {
          let k = layers[j];
          setTimeout(
            () =>
              that.drawLayer(
                response.bin,
                response.box,
                pointsLayers[k],
                rotationsLayers[k]
              ),
            that.render_delay * j
          );
        }
      });
    },
    drawLayer(bin, box, points, rotations) {
      var packs = [];
      bin = this.scale(bin);
      box = this.scale(box);
      for (let i = 0; i < points.length; i++) {
        var point = this.scale(points[i]);
        var rotation = rotations[i];
        packs[i] = this.parsePack(bin, box, point, rotation);
        packs[i].box.id += i;
        packs[i].box.id += point.z; // z different between layers
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
    }
  }
};
</script>
