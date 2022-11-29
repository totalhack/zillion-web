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

* The frontend is currently Vue 2.6+ with Vuetify 2.3+. It utilizes `vue-property-decorator`
and `vue-class-component`.
* [Billboard JS](https://github.com/naver/billboard.js/) is used for charting.
* There is not much in terms of automated testing, but it is expected to work well on Chrome and Firefox desktop. YMMV elsewhere.
* The backend is a [FastAPI](https://fastapi.tiangolo.com/) python server. You can run this
separately if you are just looking for a web API to access a `Zillion` backend.

<a name="demo"></a>

**Demo**
----------------

A demo with two example warehouses is available [here](https://zillionweb.totalhack.org). You can login with `demouser@example.com` / `demopass` to poke around. The warehouse data is not kept up to date.

<a name="installation"></a>

**Installation**
----------------

Clone this repo. Generally speaking you should follow the docs for the base [project generator](https://github.com/tiangolo/full-stack-fastapi-postgresql). You will need to change variables in the `.env` file at the project root, including adding the ones commented out or setting them otherwise in your
environment before starting the project locally with `docker-compose up`.

I've also added a "light" version of the deployment that may be more flexibly integrated with existing infrastructures. It leaves out some of the extras from the dockerswarm.rocks approach. See docker-compose.light.yml. This would be useful if, for example, you had an existing load balancer / proxy and database in the cloud that you wanted to use.

<a name="how-to-contribute"></a>

**How To Contribute**
---------------------

Any help/feedback is greatly appreciated. Please check out the basic [contributing guide](https://github.com/totalhack/zillion/blob/master/CONTRIBUTING.md) for `Zillion` as a guideline.


