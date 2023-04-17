Zillion Web: A Web UI/API for Zillion
=====================================

![Zillion Web Demo UI](https://github.com/totalhack/zillion-web/blob/master/docs/images/zillion_web_demo_ui.png?raw=true)

**Table of Contents**
---------------------

* [About Zillion Web](#about-zillion-web)
* [Demo](#demo)
* [ChatGPT Plugin](#plugin)
* [Installation](#installation)
* [How to Contribute](#how-to-contribute)

<a name="about-zillion-web"></a>

**About Zillion Web**
---------------------

> ⚠️ **Warning**: This project is experimental and mostly for demo purposes at this time.

`Zillion Web` is a monorepo frontend UI and backend API with a main objective of
demonstrating and testing some use cases for [Zillion](https://github.com/totalhack/zillion).
The project was initially created using [this](https://github.com/tiangolo/full-stack-fastapi-postgresql) project generator but has drifted a bit in terms of docker setup, library versions, and stylistic choices. It retains the same general code structure so reviewing those docs and the docs at [dockerswarm.rocks](https://dockerswarm.rocks/) will be helpful if you are looking to develop or deploy this on your own.

Some general things to know:

* This includes the `zillion[nlp]` extension to support experimental text-to-report functionality. As such you will need NLP config settings to run. See the
`Zillion` docs for more details, set up a custom zillion config with your OpenAI settings, or look at the docker files to see what environment vars you can set.
* The frontend is currently Vue 2.6+ with Vuetify 2.3+. It utilizes `vue-property-decorator` and `vue-class-component`.
* [Billboard JS](https://github.com/naver/billboard.js/) is used for charting.
* There is not much in terms of automated testing, but it is expected to work well on recent Chrome and Firefox desktop versions. YMMV elsewhere.
* The backend is a [FastAPI](https://fastapi.tiangolo.com/) python server. You can run this separately if you are just looking for a web API to access a `Zillion` backend.

<a name="demo"></a>

**Demo**
----------------

There is currently no hosted demo but the default settings will bring up a warehouse with data from the [Baseball Databank](https://github.com/chadwickbureau/baseballdatabank).

<a name="plugin"></a>

**ChatGPT Plugin**
----------------

This project contains experimental support for accessing your warehouse as a ChatGPT plugin. This requires some extra environment settings as well as you setting up the plugin within ChatGPT.

By default in dev mode (more precisely when the SERVER_HOST setting has `localhost` in it) there is no authentication. In production
you would set a Bearer token and give that to ChatGPT to access the plugin. Additionally since ChatGPT doesn't understand the concept of deciding which warehouse to query you must hardcode a warehouse ID. The following environment variables must be set:

```
PLUGIN_TOKEN=<some secure token>
PLUGIN_WAREHOUSE_ID=<your integer warehouse id>
PLUGIN_EMAIL=email@yourdomain.com
PLUGIN_LEGAL_INFO=<your domain legal info url>
```

The plugin is installed as a sub app with its own OpenAPI specification at `/plugin/openapi.json`.

<a name="installation"></a>

**Installation**
----------------

Install docker, clone this repo, and bring it up with Docker Compose. Generally speaking you should reference the docs for the base [project generator](https://github.com/tiangolo/full-stack-fastapi-postgresql). You will need to change variables in the `.env` file at the project root, including adding the ones commented out or setting them otherwise in your environment before starting the project locally with `docker-compose up`.

I've also added an "extdb" version of the docker deployment that may be more flexibly integrated with existing databases. This would be useful if you had an existing load balancer and database in the cloud that you wanted to use.

<a name="how-to-contribute"></a>

**How To Contribute**
---------------------

Any help/feedback is greatly appreciated. Please check out the basic [contributing guide](https://github.com/totalhack/zillion/blob/master/CONTRIBUTING.md) for `Zillion` as a guideline.


