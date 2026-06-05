/** Coach Kory card series — port of CoachEngine.swift */

function day1Cards() {
  const title = 'How to Use Your Custom Food Plan';
  return [
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-1.png',
      text: "When you tap on your custom food plan button, you'll see this screen at the top. You see new message from Coach Kory. This is where you'll receive messages from the coach.\n\nBelow that you see three meals and three snacks — Breakfast, Lunch, Dinner, Morning Snack, Afternoon Snack and Evening Snack.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-2.png',
      text: "When you click into the breakfast box, you'll see protein, grains and starches and extra fats. What's incredibly unique about the Burn & Build program is when you went through the questionnaire and answered all those questions, the burn engine calculated how much food you need every day. And that's what that number 4.3 servings means — you need 4.3 servings of protein for breakfast and the same concept goes for grains and starches.\n\nNow when it comes to extra fat, the Burn & Build program is also unique because it calculates how much fat you burn every day and in this case, this person burns 28 servings of fat every day. So in a nutshell, if you don't add any extra fats, your body will burn 28 teaspoons of fat off your body and that's fat loss. On the other hand, if you eat 28 servings of fat in a day, your body will burn the diet fat you ate — or sugar or alcohol — and leave the body fat alone. This is the basic principle behind why the Burn & Build program is so effective for losing fat.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-3.png',
      text: "Another unique feature of the Burn & Build program is you don't have to do any of the math. In this case the 4.3 servings is automatically calculated for each one of the foods in the drop-down list to be the right amount. For example 134 g of 95% lean ground beef is 4.3 servings. No thinking. And down the list a little farther — chicken breast with no skin, 113 g is 4.3 servings. No thinking.\n\nThis is a good place to explain why everything is in grams. It's because grams are easier and more accurate once you get used to it. All you need is a small scale. Put a plate on your scale, cook your 95% lean ground beef and put 134 g of cooked lean ground beef on your plate. Done.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-4.png',
      text: "Now do the exact same thing for grains and starches. 3.7 servings of grains and starches — if you were having black beans, that would be 216 g on your plate. That's on the scale. Done.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-5.png',
      text: "Now we're on extra fats — and you can include sugar, desserts, and alcohol in this category.\n\nBasically it's simple. If you want to lose fat as fast as possible, stay as far away from your maximum fat servings as you can — which in this case is 28. If you don't eat it, you don't have to work it off.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-6.png',
      text: "The morning snack, afternoon snack, and evening snack are all whole fresh fruit snacks — no dried fruit, no juice. And again in this program 1.3 servings, and the apples, apricots, bananas, blackberries are all measured to give 1.3 servings.\n\nYou are probably starting to realize — for probably the first time — you have a truly accurate food plan to follow. No guessing.",
    },
    {
      dayNumber: 1,
      title,
      image: 'img/coach/card-7.png',
      text: "This program is very simple to do. Protein, grains and starches for breakfast. Protein, grains and starches for lunch. Protein, grains and starches for dinner. And fruit snacks in between. That's it.\n\nI'll check in tomorrow and we'll talk about how to use the grocery list.\n\n— Coach Kory",
    },
  ];
}

/** Program day — TODO: derive from profile.programStartDate when added */
export function getProgramDay() {
  return 1;
}

export function getCoachDay(dayNumber) {
  if (dayNumber !== 1) return null;
  return {
    dayNumber: 1,
    title: 'How to Use Your Custom Food Plan',
    cards: day1Cards(),
  };
}
