var audioFile = null;
var audioAmplitude;
var audioFFT;

var walkers = [];

var fillColor, strokeColor;

var buffer;

var melt_tx = 0.0;
var melt_ty = 0.0;
var melt_sx = 0.0;
var melt_sy = 0.0;
var melt_a = 0.0;

var peakCount = 0;
var threshold = 0.2;
var gateOpen = true;

var displayText = 'loading...';
var loading = true;
var clientEvent = false;

var fileInput;

function preload() {
  soundFormats("mp3");
  audioFile = loadSound("flat-beat.mp3", finishedLoading);
}

function finishedLoading() {
  displayText = 'click to start!';
  loading = false;
  
  if (clientEvent) audioFile.loop();
}

function handleFile(file) {
  print(file);
  if (file.type === 'audio') {
    loading = true;
    
    if (audioFile != null) {
      audioFile.stop();
      audioFile = null;
    }
    
    audioFile = loadSound(file, finishedLoading);
  }
}

function setup() {
  createCanvas(800, 800);
  angleMode(DEGREES);
  
  fileInput = createFileInput(handleFile);

  audioAmplitude = new p5.Amplitude();

  let smoothing = 0.8;
  let numBins = 32;
  audioFFT = new p5.FFT(smoothing, numBins);

  for (i = 0; i < numBins; i++) {
    let walker = createWalker(random(width), random(height));
    walkers.push(walker);
  }

  fillColor = 255;
  strokeColor = 0;

  buffer = createGraphics(width, height);
  buffer.noSmooth();

  melt_tx = random(width);
  melt_ty = random(height);
  melt_sx = random(width);
  melt_sy = random(height);
  melt_a = random(-0.01, 0.01);

  minThreshold = 0.1;
  maxThreshold = 0.2;
}

function draw() {
  if (!loading && !clientEvent) {
    if (audioFile == null) return;
    if (audioFile.isPlaying()) return;
    textSize(64);
    textAlign(CENTER, CENTER);
    text(displayText, width/2, height/2);
  }
  
  //background(fillColor);

  //Get All Audio Analysis Information!

  //this number is usually between (0 - 1)
  let level = audioAmplitude.getLevel();

  let spectrum = audioFFT.analyze();

  let waveResolution = 1024;
  let waveform = audioFFT.waveform(waveResolution);

  //Now do whatever drawing we want with that info

  let levelColor = level * 2 * 255;
  fillColor = 255 - levelColor;
  strokeColor = levelColor;
  
  if (peakCount > 3) {
    randomizeMelt();
    peakCount = 0;
  }

  updateMelt();

  let translateX = (melt_tx - width / 2) * 0.005;
  let translateY = (melt_ty - height / 2) * 0.005;
  let scaleX = (melt_sx - width / 2) * 0.05;
  let scaleY = (melt_sy - height / 2) * 0.05;

  melt_tx += (translateX - melt_tx) * 0.05;
  melt_ty += (translateY - melt_ty) * 0.05;

  melt_sx += (scaleX - melt_sx) * 0.05;
  melt_sy += (scaleY - melt_sy) * 0.05;

  melt(melt_tx, melt_ty, melt_sx, melt_sy, melt_a);

  for (let i = 0; i < walkers.length; i++) {
    let currentWalker = walkers[i];

    let binAmplitude = spectrum[i] / 255;
    let walkerSize = binAmplitude * 100;

    currentWalker.x += cos(currentWalker.direction) * binAmplitude * 8;
    currentWalker.y += sin(currentWalker.direction) * binAmplitude * 8;

    if (currentWalker.x > width) currentWalker.x = 0;
    if (currentWalker.x < 0) currentWalker.x = width;
    if (currentWalker.y > height) currentWalker.y = 0;
    if (currentWalker.y < 0) currentWalker.y = height;

    buffer.fill(fillColor);
    buffer.stroke(strokeColor);
    buffer.strokeWeight(2);

    if (binAmplitude > 0.8) {
      const rc = int(i + peakCount) % 3;
      let c = color(0);

      switch (rc) {
        case 0:
          c = lerpColor(color(255, 0, 0), color(fillColor), (1.0 - binAmplitude)/0.2);
          buffer.fill(c);
          break;
        case 1:
          c = lerpColor(color(0, 0, 255), color(fillColor), (1.0 - binAmplitude)/0.2);
          buffer.fill(c);
          break;
        case 2:
          c = lerpColor(color(255, 255, 0), color(fillColor), (1.0 - binAmplitude)/0.2);
          buffer.fill(c);
          break;
        default:
          break;
      }
    }
    
    if (int(frameCount/60 + i + peakCount) % 4 == 0) buffer.erase();

    buffer.ellipse(currentWalker.x, currentWalker.y, walkerSize);
    
    buffer.noErase();
  }

  if (level > threshold && gateOpen) {
    peakCount++;
    gateOpen = false;

    for (let i = 0; i < 4; i++) {
      let w = random(100, 400);
      let h = random(100, 400);
      let x = random(width - w);
      let y = random(height - h);

      const region = buffer.get(x, y, w, h);
      region.filter(GRAY);
      region.filter(INVERT);

      w = random(w - w * 0.1, w + w * 0.1);
      h = random(h - h * 0.1, h + h * 0.1);
      x = random(x - w * 0.1, x + w * 0.1);
      y = random(y - h * 0.1, h + w * 0.1);

      buffer.image(region, x, y, w, h);
      
      if (int(frameCount/60 + i + peakCount) % 4 == 0) {
        buffer.erase();
        buffer.rect(x, y, w, h);
        buffer.noErase();
      } 
      
      
    }
  } else if (level <= threshold && !gateOpen) {
    gateOpen = true;
  }

  image(buffer, 0, 0);
}

function createWalker(posX, posY) {
  let walker = {
    x: posX,
    y: posY,
    dirX: random(-1, 1),
    dirY: random(-1, 1),
    direction: random(360),
    size: 10,
  };

  return walker;
}

function drawAmplitude(level) {
  let size = 100 + level * 100;
  ellipse(width / 2, height / 2, size);
}

function drawSpectrum(spectrum) {
  noStroke();
  fill(strokeColor);

  for (let i = 0; i < spectrum.length; i++) {
    //this is from the p5.sound example
    //let x = map(i, 0, spectrum.length, 0, width);

    //these lines do the same thing but more clearly
    //calculate width of each rectangle:
    let cellSize = width / spectrum.length;
    //calculate x position of each rectangle
    let x = i * cellSize;

    //this is from the p5.sound example
    // let h = -height + map(spectrum[i], 0, 255, height, 0);

    //get the amplitude of each bin in the FFT
    let binAmplitude = spectrum[i];

    //normalize the amplitude of each bin (max value is 255)
    let h = ((binAmplitude / 255) * -height) / 4;

    rect(x, height, cellSize, h);
  }
}

function drawWaveform(waveform) {
  noFill();
  strokeWeight(2);
  stroke(strokeColor);
  //declare that we are drawing some complex 2D shape
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    //these two lines are from the original example
    //let x = map(i, 0, waveform.length, 0, width);
    //let y = map( waveform[i], -1, 1, 0, height);

    let waveSegmentWidth = width / waveform.length;
    let x = i * waveSegmentWidth;

    let waveformSegmentValue = waveform[i];
    let waveformHeight = 200;
    let y = height / 2 + waveformSegmentValue * waveformHeight;

    //add a point to our custom 2D shape
    curveVertex(x, y);
  }
  //okay, we're done with our complex shape
  endShape();
}

function mousePressed() {
  if (loading) return;
  clientEvent = true;

  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    togglePlay();
  }
}

function togglePlay() {
  if (audioFile.isPlaying()) {
    audioFile.pause();
  } else {
    audioFile.loop();
  }
}

function melt(tx, ty, sx, sy, angle) {
  buffer.push();

  buffer.translate(tx + width / 2, ty + height / 2);
  buffer.rotate(angle);

  buffer.image(
    buffer,
    -sx / 2 - width / 2,
    -sy / 2 - height / 2,
    sx + width,
    sy + height
  );

  buffer.pop();
}

function updateMelt() {
  melt_tx +=
    cos(1.1 + frameCount * audioAmplitude.getLevel() * 10) *
    audioAmplitude.getLevel() *
    8;
  melt_ty +=
    sin(1.2 + frameCount * audioAmplitude.getLevel() * 10) *
    audioAmplitude.getLevel() *
    8;
  melt_sx +=
    cos(1.3 + frameCount * audioAmplitude.getLevel() * 10) *
    audioAmplitude.getLevel() *
    8;
  melt_sy +=
    sin(1.4 + frameCount * audioAmplitude.getLevel() * 10) *
    audioAmplitude.getLevel() *
    8;
}

function randomizeMelt() {
  melt_tx = random(-width / 2, width / 2) * 0.1;
  melt_ty = random(-height / 2, height / 2) * 0.1;
  melt_sx = random(-width / 2, width / 2) * 0.1;
  melt_sy = random(-height / 2, height / 2) * 0.1;
  melt_a = random(-0.0048, 0.0048);
}
