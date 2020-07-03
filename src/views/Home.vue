<template>
  <div class="home">
    <Scene >
			<PointLight :position="[400, 3000, 600]"></PointLight>

			<Box v-for="pack in packs"
			  :position="getPosition(pack)"
			  :options="getOptions(pack)"
			  v-bind:key="pack.box.id">

			  <Material :diffuse="getRandomColor()"></Material>
			</Box>
		</Scene>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: "Home",
  data () {
  	return {
  		colors: {},
    	boxWithEdges: null,
    	packs: []
    };
  }
};
</script>
