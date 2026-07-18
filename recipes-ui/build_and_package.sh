#!/bin/bash
rm recipes-dist.tar.gz
npm run build
cd dist
tar czf ../recipes-dist.tar.gz *
