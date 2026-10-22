// Original generated artwork, paired with the Kiro seal by the sticker renderer.
const designs = [
  ['cozy-cat', 'Cozy cloud cat', 'a warm mug and a little build break'],
  ['sleepy-panda', 'Sleepy build buddy', 'rest while the deployment finishes'],
  ['boba-buddy', 'Boba break', 'powered by pearls and cloud ideas'],
  ['happy-dumpling', 'Dumpling buddy', 'a little treat after shipping'],
  ['cloud-nap', 'Cloud nap', 'dreaming up the next big thing'],
  ['avocado-hug', 'Avo good build', 'better when we build together'],
  ['tiny-dino', 'Tiny dino, big ideas', 'small arms, big cloud dreams'],
  ['strawberry-frog', 'Berry good builder', 'a tiny frog cheering you on'],
  ['moon-bunny', 'Moonlight builder', 'one small hop into the cloud'],
  ['toast-besties', 'Toast to the team', 'a high five for every little win'],
  ['coding-duck', 'Debug duck', 'tell your little buddy about the bug'],
  ['rain-boot', 'Cloudy with flowers', 'a little joy for a rainy build day'],
  ['space-corgi', 'Cosmic cloud corgi', 'exploring one cloud at a time'],
  ['book-worm', 'Curious little builder', 'always learning something new'],
  ['peach-pals', 'Peachy teammates', 'the sweetest little community'],
  ['mushroom-mage', 'Tiny cloud wizard', 'a sprinkle of builder magic'],
  ['lucky-capybara', 'Keep calm and build', 'capybara approved cloud break'],
  ['jellyfish-jam', 'Deep focus jelly', 'headphones on, building mode'],
  ['ramen-kitten', 'Ramen and releases', 'a cozy reward for a shipped idea'],
  ['star-mail', 'A little cloud hello', 'sending good vibes to your community'],
];

export const cuteStickers = Object.fromEntries(designs.map(([id, label, caption]) => [id, {
  label, caption, type: 'cute', src: `/scrapbook/stickers/${id}.webp`,
}]));
