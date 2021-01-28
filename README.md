Zillion Web: A Web UI/API for Zillion
=====================================

![Zillion Web Demo UI](https://github.com/totalhack/zillion-web/blob/master/docs/images/zillion_web_demo_ui.png?raw=true)

**Table of Contents**
---------------------

* [About Zillion Web](#about-zillion-web)
* [Demo](#demo)
* [Installation](#installation)
* [How to Contribute](#how-to-contribute)

<a name="about-zillion-web"></a>

**About Zillion Web**
---------------------

> ⚠️ **Warning**: This project is experimental and mostly for demo purposes at this time.

`Zillion Web` is a monorepo frontend UI and backend API with a main objective of
demonstrating and testing some use cases for [Zillion](https://github.com/totalhack/zillion).
The project was initially created using [this](https://github.com/tiangolo/full-stack-fastapi-postgresql) project generator. It retains the same general structure
and approaches taken there, so reviewing those docs and the docs at [dockerswarm.rocks](https://dockerswarm.rocks/) will be helpful if you are looking to develop or deploy this
on your own. Some library versions, stylistic choices, and architectural pieces have been
changed or removed.

Some general things to know:

* This was my first Vue/Typescript project. Part of the goal was to learn, and there are
most certainly things that could have been done better and/or shortcuts taken.
* The frontend is currently Vue 2.6+ with Vuetify 2.3+. It utilizes `vue-property-decorator`
and `vue-class-component`. While this approach was inherited from the project generator, I later found out it is not "officially" supported by the Vue community. If I started a new
project from scratch or moved to Vue 3, I would probably change this.
* [Billboard JS](https://github.com/naver/billboard.js/) is used for charting.
* Frontend automated testing is pretty minimal at the moment. It is expected that the basics
work on recent non-IE browsers and most recent mobile devices.
* The backend is a [FastAPI](https://fastapi.tiangolo.com/) python server. You can run this
separately if you are just looking for a web API to access a `Zillion` backend.
* Docker / Docker Compose/ Docker Swarm Mode are utilized as described in the docs for the
project generator and at [dockerswarm.rocks](https://dockerswarm.rocks/). In my research I
came to find out Docker Swarm Mode is not a very popular approach in 2020, but I stuck with
it for the purposes of the demo deployment.
* This is deployed on a minimally sized VPS. Go easy please.

While I will likely continue building on this project, it is currently viewed as just a demo
and therefore not something I intend to spend much time supporting. That may change down
the road, and I will certainly try to address any major issues/bugs.

<a name="demo"></a>

**Demo**
--------

The demo UI is deployed [here](https://zillionweb.totalhack.org/). A demo user has been created with the following credentials:

* `user`: demouser@example.com
* `password`: demopass

Two example `Warehouses` have been loaded:

* A slightly modified version of the [Zillion Covid-19](https://github.com/totalhack/zillion-covid-19) demo warehouse.
* The [Zillion Baseball](https://github.com/totalhack/zillion-baseball) demo warehouse, which has a subset of data from the [Baseball Data Bank](https://github.com/chadwickbureau/baseballdatabank).

Note that the sample data is not being automatically updated at this time. 

You can use the control bar at the bottom to run/save/configure/download reports, or utilize the keyboard shortcuts if on desktop (hover over the buttons to see shortcuts). Since this is just a frontend to the main report execution API that [Zillion](https://github.com/totalhack/zillion) exposes it is recommended to read the more thorough Zillion docs for a better understanding of the fields, options, and general theory/approach.

<a name="installation"></a>

**Installation**
----------------

Clone this repo. Generally speaking you should follow the docs for the base [project generator](https://github.com/tiangolo/full-stack-fastapi-postgresql). You will need to change variables in the `.env` file at the project root, including adding the ones commented out or setting them otherwise in your
environment before starting the project locally with `docker-compose up`.

<a name="how-to-contribute"></a>

**How To Contribute**
---------------------

Any help/feedback is greatly appreciated. Please check out the basic [contributing guide](https://github.com/totalhack/zillion/blob/master/CONTRIBUTING.md) for `Zillion` as a guideline.


