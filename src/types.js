/**
 * @typedef {'heroes' | 'community-builders' | 'user-groups' | 'cloud-clubs' | 'news'} CategoryKey
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
 * @property {string} [tag]
 * @property {string} [heroType]
 * @property {string} [builderType]
 * @property {string} [specialization]
 * @property {{ name: string, imageUrl: string }[]} [ledBy]
 */

/**
 * @typedef {Object} CategoryData
 * @property {CategoryKey} category
 * @property {Member[]} members
 */

/**
 * @typedef {Object} NewsItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} url
 * @property {string} imageUrl
 * @property {string} authorName
 * @property {string} authorAlias
 * @property {string} authorAvatarUrl
 * @property {string} location
 * @property {number} lat
 * @property {number} lng
 * @property {string[]} tags
 * @property {string} publishedAt
 * @property {number} likesCount
 * @property {number} commentsCount
 */

/**
 * @typedef {Object} NewsData
 * @property {string} updatedAt
 * @property {NewsItem[]} latest
 * @property {NewsItem[]} trending
 */

export {};
