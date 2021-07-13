import json from '@rollup/plugin-json';
import {terser} from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  watch: true,
  external: ['d3'],
  output: [
    // {
    //   file: 'dist/cgview.js',
    //   format: 'iife',
    //   name: 'CGV',
    //   globals: {d3: 'd3'},
    //   banner: '// +-------------------------------------------------------+\n// |             _____________    ___                      |\n// |            / ____/ ____/ |  / (_)__ _      __         |\n// |           / /   / / __ | | / / / _ \\ | /| / /         |\n// |          / /___/ /_/ / | |/ / /  __/ |/ |/ /          |\n// |          \\____/\\____/  |___/_/\\___/|__/|__/           |\n// +-------------------------------------------------------+\n'
    // },
    {
      file: 'dist/cgview.min.js',
      format: 'iife',
      name: 'CGV',
      globals: {d3: 'd3'},
      plugins: [terser()]
    },
    // {
    //   file: 'dist/cgview.esm.min.js',
    //   format: 'es',
    //   globals: {d3: 'd3'},
    //   plugins: [terser()]
    // },
    // {
    //   file: 'dist/cgview.esm.js',
    //   globals: {d3: 'd3'},
    //   format: 'es',
    // },
    // {
    //   file: 'dist/cgview.umd.min.js',
    //   format: 'umd',
    //   name: 'CGV',
    //   plugins: [terser()]
    // }
  ],
  plugins: [ json() ]
};


