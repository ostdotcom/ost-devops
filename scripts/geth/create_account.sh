#!/bin/bash

DATADIR=$1

GETH_EXEC=$(which geth)

$GETH_EXEC account new --datadir $DATADIR