/**
 * @typedef {'heroes' | 'experimental' | 'community-builders' | 'user-groups' | 'cloud-clubs' | 'aws-community-day-singapore' | 'news' | 'kiro-ambassadors' | 'aws-ambassadors' | 'kiro-events'} CategoryKey
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
 * @property {string} [builderProfileUrl]
 * @property {string} [tag]
 * @property {string} [heroType]
 * @property {string} [builderType]
 * @property {string} [specialization]
 * @property {{ name: string, imageUrl: string, profileUrl?: string, socialLinks?: { linkedin?: string, github?: string, x?: string, devto?: string, youtube?: string, facebook?: string, repost?: string, blog?: string, website?: string } }[]} [ledBy]
 * @property {boolean} [isNew]
 * @property {string} [eventDate]
 * @property {string} [description]
 * @property {string} [ctaLabel]
 * @property {string} [country]
 * @property {number} [builderCount]
 * @property {boolean} [clusterOnly]
 * @property {{ linkedin?: string, github?: string, x?: string, devto?: string, youtube?: string, facebook?: string, repost?: string, blog?: string, website?: string }} [socialLinks]
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
