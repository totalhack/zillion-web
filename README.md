Zillion Web: A Web UI/API for Zillion
=====================================

![Zillion Web Demo UI](https://github.com/totalhack/zillion-web/blob/master/docs/images/zillion_web_demo_ui.png?raw=true)

**Table of Contents**
---------------------

* [About Zillion Web](#about-zillion-web)
* [Installation](#installation)
* [How to Contribute](#how-to-contribute)

<a name="about-zillion-web"></a>

**About Zillion Web**
---------------------

> ⚠️ **Warning**: This project is experimental.

`Zillion Web` is a monorepo frontend UI and backend API with a main objective of
demonstrating and testing some use cases for [Zillion](https://github.com/totalhack/zillion).
The project was initially created using [this](https://github.com/tiangolo/full-stack-fastapi-postgresql) project generator but has drifted a bit in terms of docker setup, library versions, and stylistic choices. It retains the same general code structure so reviewing those docs and the docs at [dockerswarm.rocks](https://dockerswarm.rocks/) will be helpful if you are looking to develop or deploy this on your own.

There is currently no hosted demo but the default settings should bring up a sample warehouse.

<a name="installation"></a>

**Installation**
----------------

Install docker, clone this repo, and bring it up with Docker Compose. Generally speaking you should reference the docs for the base [project generator](https://github.com/tiangolo/full-stack-fastapi-postgresql). You will need to change variables in the `.env` file at the project root, including adding the ones commented out or setting them otherwise in your environment before starting the project locally with `docker-compose up`.

I've also added an "extdb" version of the docker deployment that may be more flexibly integrated with existing databases. This would be useful if you had an existing load balancer and database in the cloud that you wanted to use.

<a name="how-to-contribute"></a>

**How To Contribute**
---------------------

Any help/feedback is greatly appreciated. Please check out the basic [contributing guide](https://github.com/totalhack/zillion/blob/master/CONTRIBUTING.md) for `Zillion` as a guideline.


