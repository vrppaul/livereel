// A film's things for the smoke tests: a card, a flat box of one colour turned about its upright by its `turn`, from
// none to a quarter round, and as clear as it has come up
const CARD = { width: 300, height: 180, thickness: 12, colour: '#5b8def' };
const A_QUARTER_TURN = Math.PI / 2;

export default {
	card: {
		build: (three) =>
			new three.Mesh(
				new three.BoxGeometry(CARD.width, CARD.height, CARD.thickness),
				new three.MeshBasicMaterial({ color: CARD.colour, transparent: true })
			),
		set: (built, values, shown) => {
			built.rotation.set(0, values.turn * A_QUARTER_TURN, 0);
			built.material.opacity = shown;
		}
	}
};
