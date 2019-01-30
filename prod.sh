#!/bin/bash

yarn unlink @ournet/domain
yarn unlink news-sources
yarn unlink @ournet/news-domain
yarn unlink @ournet/news-data
yarn unlink @ournet/topics-domain
yarn unlink @ournet/topics-data
yarn unlink @ournet/quotes-domain
yarn unlink @ournet/quotes-data
yarn unlink @ournet/images-domain
yarn unlink @ournet/images-data
yarn unlink @ournet/videos-domain
yarn unlink @ournet/videos-data

yarn add @ournet/domain
yarn add news-sources
yarn add @ournet/news-domain
yarn add @ournet/news-data
yarn add @ournet/topics-domain
yarn add @ournet/topics-data
yarn add @ournet/quotes-domain
yarn add @ournet/quotes-data
yarn add @ournet/images-domain
yarn add @ournet/images-data
yarn add @ournet/videos-domain
yarn add @ournet/videos-data

yarn test
