import { decode } from 'he';

/**
 * Determine whether or not the interaction should be rendered in 3d
 * @param {object} interaction Interaction.
 * @returns {boolean} True, if should be rendered in 3D.
 */
export const renderIn3d = (interaction) => {
  return interaction.showAsHotspot || interaction.showAsOpenSceneContent;
};

/**
 * Enforce value to be not smaller than minumum and not larger than maximum.
 * @param {number} min Minumum.
 * @param {number} value Value to be put in boundaries.
 * @param {number} max Maximum.
 * @returns {number} Value within boundaries.
 */
export const clamp = (min, value, max) => Math.min(max, Math.max(min, value));

/**
 * Extend an array just like JQuery's extend.
 * @param {object[]} theArgs Objects to be extended.
 * @returns {object} Merged objects.
 */
export const extend = (...theArgs) => {
  for (let i = 1; i < theArgs.length; i++) {
    for (let key in theArgs[i]) {
      if (Object.prototype.hasOwnProperty.call(theArgs[i], key)) {
        if (
          typeof theArgs[0][key] === 'object' &&
          typeof theArgs[i][key] === 'object'
        ) {
          extend(theArgs[0][key], theArgs[i][key]);
        }
        else {
          theArgs[0][key] = theArgs[i][key];
        }
      }
    }
  }
  return theArgs[0];
};

/**
 * HTML decode and strip HTML.
 * @param {string|object} html html.
 * @returns {string} html value.
 */
export const purifyHTML = (html) => {
  if (typeof html !== 'string') {
    return '';
  }

  let text = decode(html);
  const div = document.createElement('div');
  div.innerHTML = text;
  text = div.textContent || div.innerText || '';

  return text;
};
