#!/usr/bin/env python
"""Helper script to initialize embeddings for a warehouse."""

from tlbx import Script, Arg
from zillion import Warehouse


@Script(
    Arg("wh_id", help="Warehouse ID to call init embeddings for"),
    Arg("--force-recreate", action="store_true", help="Force recreate embeddings"),
)
def main(wh_id, force_recreate=False):
    wh = Warehouse.load(wh_id)
    wh.init_embeddings(force_recreate=force_recreate)


if __name__ == "__main__":
    main()
