//
// Sky Hoffert
// Last Modified Dec 4, 2019
// new version of The Space Engineer
//

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application();
document.body.appendChild(app.view);

// load the texture we need
app.loader.add("guy", 'gfx2/still_1.png').load((loader, resources) => {
    const guy = new PIXI.Sprite(resources.guy.texture);

    guy.scale.set(4, 4);

    // Setup the position of the bunny
    guy.x = app.renderer.width / 2;
    guy.y = app.renderer.height / 2;

    // Rotate around the center
    guy.anchor.x = 0.5;
    guy.anchor.y = 1;

    // Add the bunny to the scene we are building
    app.stage.addChild(guy);

    // Listen for frame updates
    app.ticker.add(() => {
         // each frame we spin the bunny around a bit
        guy.rotation += 0.01;
        guy.x += 0.1;
    });
});