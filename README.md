# fourd-starter-kit
An HTML5 starter kit for a page using FourD Graphs.

I just discovered this dead simple html5 boilerplate and decided to build a template repository for displaying 3D graphs. 

You'll need Node.js and NPM installed, more [here](https://nodejs.org/), and a WebGL capable computer. Which these days should really mean a Raspberry Pi 4 or up.

```sh
git clone https://github.com/stauffenbits/fourd-starter-kit.git <your name for this project>
cd <same name>
npm install
npm start
```

Afterwards, you can edit `js/main.js` and implement your custom logic. I will be adding little snippets to the `main.js` file to showcase pieces of more or less stable functionality. 

A word of warning: This is still kinda inefficient, as the math is just a wee bit over my head. So it'll stop working at a graph size of between 250 and 1000 vertices. Spread that stuff out in space and time!

Another word of warning: The entire library is due for a rewrite. There was a lot I didn't know when I started this version. Alas, the days are short. 
