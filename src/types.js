/**
 * @typedef {'heroes' | 'community-builders' | 'user-groups' | 'cloud-clubs'} CategoryKey
 */

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} name
 * @property {string} avatarUrl
 * @property {CategoryKey} category
 * @property {string} location  - Human-readable city/country
 * @property {number} lat       - Geographic latitude
 * @property {number} lng       - Geographic longitude
 * @property {string} [profileUrl]
 */

/**
 * @typedef {Object} CategoryData
 * @property {CategoryKey} category
 * @property {Member[]} members
 */

export {};
