import URLS from './constants/urls';
import STORAGE_KEYS from './constants/storageKeys';
import axios from 'axios';
import moment from 'moment';
import isNil from 'lodash/isNil';
import isEmpty from 'lodash/isEmpty';
import isObject from 'lodash/isObject';
import isArray from 'lodash/isArray';
import forEach from 'lodash/forEach';
import isEqual from 'lodash/isEqual';

export default class VerbiagePlugin {

  /**
   * @param {Object} options - container for optional values.
   * @param {string} options.baseUrl - Optional value for setting baseUrl of Verbiage MS API.
   * @param {string[]} options.locales - Collection of locales that will be requested from the API.
   * @return {void}
   */
  constructor (options = {}) {
    this.baseUrl = !isNil(options.baseUrl) ? options.baseUrl : URLS.DEFAULT_BASE;
    this.locales = !isNil(options.locales) ? options.locales : ['en', 'se'];

    if (this.isLocalesExistAndUnchanged()) {
      this.loadLastUpdate()
          .then((r1) => {

            if (this.isThereAnUpdate(r1.data)) {
              this.loadVerbiageTerms()
                  .then((r2) => {
                    this.storeVerbiageTerms(r2.data);
                    this.refreshPage();
                  })
            }
          });

    } else {
      this.clearVerbiageTerms(this.locales);
      this.storeLocales(this.locales);

      this.loadLastUpdate().then((r) => {
        this.storeLastUpdate(r.data);

        this.loadVerbiageTerms().then((r) => {
          this.storeVerbiageTerms(r.data);
          this.refreshPage();
        });
      });
    }
  }

  /**
   * @return {Promise<Object>}
   */
  loadVerbiageTerms () {
    return new Promise((resolve, reject) => {
      const method = 'GET';
      const url = `${this.baseUrl}${URLS.GENERATE}`;
      const params = {locales: this.locales.join(',')};

      axios({method, url, params})
        .then((r) => {
          resolve(r);

        })
        .catch((e) => {
          console.error(e);
          reject(e);
        });
    });
  }

  /**
   * @return {Promise<Object>}
   */
  loadLastUpdate () {
    return new Promise((resolve, reject) => {

      const method = 'GET';
      const url = `${this.baseUrl}${URLS.LAST_UPDATE}`;

      axios({method, url})
        .then((r) => {
          resolve(r);

        })
        .catch((e) => {
          console.error(e);
          reject(e);
        });
    });
  }

  /**
   * @return {boolean}
   */
  isThereAnUpdate (newDates) {
    let oldDates = this.getLastUpdate();

    if (!isNil(oldDates)) {
      const oldVerbiages = moment(oldDates.verbiages);
      const recentVerbiages = moment(newDates.verbiages);
      const oldTerms = moment(oldDates.terms);
      const recentTerms = moment(newDates.terms);

      const result = recentVerbiages.isAfter(oldVerbiages) || recentTerms.isAfter(oldTerms);

      if (result) {
        this.storeLastUpdate(newDates);
      }

      return result;

    } else {
      this.storeLastUpdate(newDates);
      return true;
    }
  }

  /**
   * @param {Object} dates
   * @return {void}
   */
  storeLastUpdate (dates) {
    if (
      !isNil(dates)
      && !isEmpty(dates)
      && isObject(dates) && !isArray(dates)
    ) {
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, JSON.stringify(dates));
    }
  }

  /**
   * @returns {Object}
   */
  getLastUpdate () {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
    return !isNil(stored) ? JSON.parse(stored) : null;
  }

  clearLastUpdate () {
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATE);
  }

  /**
   * @param {Object} terms
   * @return {void}
   */
  storeVerbiageTerms (terms) {
    if (
      !isNil(terms)
      && !isEmpty(terms)
      && isObject(terms) && !isArray(terms)
    ) {
      forEach(this.getStoredLocales(), (locale) => {

        if (
          !isNil(terms[locale])
          && !isEmpty(terms[locale])
        ) {
          localStorage.setItem(STORAGE_KEYS.TERM_PREFIX + locale, JSON.stringify(terms[locale]));
        }
      });
    }
  }

  /**
   * @param {array} locales
   * @return {void}
   */
  clearVerbiageTerms (locales) {
    forEach(locales, (locale) => {
      localStorage.removeItem(STORAGE_KEYS.TERM_PREFIX + locale);
    });
  }

  // noinspection JSUnusedGlobalSymbols
  getVerbiageTerms () {
    let terms = {};

    forEach(this.getStoredLocales(), (locale) => {
      const stored = localStorage.getItem(STORAGE_KEYS.TERM_PREFIX + locale);
      if (!isNil(stored) && !isEmpty(stored)) {
        terms[locale] = JSON.parse(stored);
      } else {
        terms[locale] = {};
      }
    });

    return terms;
  }

  /**
   * @param {array} locales
   * @return {void}
   */
  storeLocales (locales) {
    if (
      !isNil(locales)
      && !isEmpty(locales)
      && isArray(locales)
    ) {
      localStorage.setItem(STORAGE_KEYS.LOCALES, locales.join(','));
    }
  }

  clearStoredLocales () {
    localStorage.removeItem(STORAGE_KEYS.LOCALES);
  }

  /**
   * @return {string[]}
   */
  getStoredLocales () {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALES);
    return !isNil(stored) ? stored.split(',') : [];
  }

  /**
   * @return {boolean}
   */
  isLocalesExistAndUnchanged () {
    const stored = this.getStoredLocales();

    if (!isNil(stored) && !isEmpty(stored)) {
      return isEqual(stored.sort(), this.locales.sort());

    } else {
      return false;
    }
  }

  /**
   * @return {void}
   */
  refreshPage () {
    setTimeout(() => {
      location.reload();
    }, 100);
  }

  // noinspection JSUnusedGlobalSymbols
  clearCache () {
    this.clearVerbiageTerms(this.getStoredLocales());
    this.clearLastUpdate();
    this.clearStoredLocales();
  }
}


