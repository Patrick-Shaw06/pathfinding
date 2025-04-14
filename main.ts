//  Set Group for Radio Communications
radio.setGroup(8)
music.setTempo(200)
//  speed of audio representation of moves
//  Basic Functions for Movement
//  Check for wall
function isWall(distanceThreshold: number) {
    //  If too close to wall, back up slightly
    if (CutebotPro.ultrasonic(SonarUnit.Centimeters) < 5) {
        CutebotPro.pwmCruiseControl(-10, -10)
        CutebotPro.distanceRunning(CutebotProOrientation.Retreat, 3, CutebotProDistanceUnits.Cm)
    }
    
    return CutebotPro.ultrasonic(SonarUnit.Centimeters) < distanceThreshold
}

//  Turning left
function turnLeft() {
    CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0xff0000)
    CutebotPro.trolleySteering(CutebotProTurn.LeftInPlace, 95)
    CutebotPro.turnOffAllHeadlights()
}

//  Turning right
function turnRight() {
    CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0xff0000)
    CutebotPro.trolleySteering(CutebotProTurn.RightInPlace, 95)
    CutebotPro.turnOffAllHeadlights()
}

//  Moving forwards
function moveForward() {
    /** 
    The bot moves forward by moving relative to the gridlines in order to
        stay aligned within the maze grid.
    To do this it moves forward until it senses a gridline with one of the
        tracking sensors.
    Then, it turns until all four tracking sensors sense the line, meaning
        the bot is straightened.
    Lastly, it moves forwards half of the distance of one grid space.
    
 */
    CutebotPro.colorLight(CutebotProRGBLight.RGBA, 0x00ff00)
    //  Move forwards until gridline is reached
    while (Math.abs(CutebotPro.getOffset()) >= 2800) {
        CutebotPro.pwmCruiseControl(10, 10)
    }
    //  Too far left; the bot needs to turn right
    if (CutebotPro.getOffset() > 0) {
        while (CutebotPro.getOffset() > 0 && CutebotPro.getOffset() < 3000) {
            CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0x0000ff)
            CutebotPro.pwmCruiseControl(10, 0)
            CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0x00ff00)
        }
        CutebotPro.pwmCruiseControl(10, 10)
        CutebotPro.distanceRunning(CutebotProOrientation.Advance, 5, CutebotProDistanceUnits.Cm)
    } else {
        //  Too far right; the bot needs to turn left
        while (CutebotPro.getOffset() < 0 && CutebotPro.getOffset() > -3000) {
            CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0x0000ff)
            CutebotPro.pwmCruiseControl(0, 10)
            CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0x00ff00)
        }
        CutebotPro.pwmCruiseControl(10, 10)
        CutebotPro.distanceRunning(CutebotProOrientation.Advance, 5, CutebotProDistanceUnits.Cm)
    }
    
    //  Move forwards halfway into next grid square
    CutebotPro.distanceRunning(CutebotProOrientation.Advance, 30.7 / 2, CutebotProDistanceUnits.Cm)
    CutebotPro.turnOffAllHeadlights()
}

//  Function to Navigate Maze
function navigateMaze(distanceThreshold: number, magnetThreshold: number) {
    let move: number;
    let i: number;
    let j: number;
    let newMoves: number[];
    /** 
    Navigating the maze is broken into four steps as follows:
        1: Pathfinding through the maze until the bomb is found
        2: Calculating an optimized path to the bomb
        3: Transmitting this path to second robot
        4: Reversing this path to optimize exiting
        5: Exiting the maze
    
    Step 1 - Pathfinding Through the Maze:
    The maze is navigated by always followling the left wall.
    This works by prioritizing turning left, then going forward,
        then turning right, and lastly backtracking.
    The bot will turn left and then go through each direction until
        it finds a direction it can go in.
    Move is incremented with each turn to represent the direction the
        bot goes, with the directions as follows:
            1: Left turn
            2: Forwards
            3: Right turn
            4: Backwards
    These directions are stored to later be reported once the bomb is found.
    
 */
    let moves = []
    //  List to store past moves
    //  Navigate maze until magnet is found
    while (Math.abs(input.magneticForce(Dimension.Z)) < magnetThreshold) {
        //  Check left direction first
        turnLeft()
        move = 1
        //  Turn right until open move found
        while (isWall(distanceThreshold)) {
            turnRight()
            move += 1
        }
        //  Increment to track which direction is moved
        moveForward()
        //  Move forward to next square
        moves.push(move)
    }
    //  Save direction moved to list
    basic.showLeds(`
    . # # . .
    . # # # .
    . # # # #
    . # . . .
    # # # # #
    `)
    //  To show that the bomb has been found
    //  Play tones representing path taken
    for (i = 0; i < moves.length; i++) {
        if (moves[i] == 1) {
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (moves[i] == 2) {
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (moves[i] == 3) {
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (moves[i] == 4) {
            music.play(music.tonePlayable(Note.C5, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        }
        
        music.rest(music.beat(BeatFraction.Half))
    }
    music.rest(music.beat(BeatFraction.Breve))
    /** 
    Step 2 - Calculating Optimized Path:
    The move list is optimized by removing moves that lead towards dead ends.
    Dead ends require the bot to turn around, represented by a 4 in the move list.
    Duplicated moves leading up to these dead ends will add up to 4 as well.
    The resultant move instead of turning towards the last end will be the sum
        of the moves entering and exiting the dead end section.
    
 */
    i = 0
    //  Loop through the list of moves
    while (i < moves.length) {
        if (moves[i] == 4) {
            //  If the bot turned around on a certain move (reached a dead end)
            j = 1
            //  Use a second loop to find extent of dead end path
            while (i - j >= 0 && i + j < moves.length && moves[i - j] + moves[i + j] == 4) {
                j += 1
            }
            //  Increment j to move on to next pair of values
            //  Build new list of moves with dead ends filtered out
            newMoves = moves.slice(0, i - j)
            //  Moves before dead end
            newMoves.push(moves[i - j] + moves[i + j])
            //  Move made of combined moves entering and leaving dead end
            for (let k = i + j + 1; k < moves.length; k++) {
                //  Moves after dead end
                newMoves.push(moves[k])
            }
            moves = newMoves
            i = 0
        }
        
        //  Length and index of list changes. I could calculate the new list but its easier to just start at the beginning again.
        i += 1
    }
    //  Increment i to move on to next index
    /** 
    Step 3 - Transmitting Optimized Path
    Transmitting the optimized path simply requires iterating through moves
        and transmitting each value.
    To confirm transmission and reception, each bot will play a tone corresponding
        to the move transmitted.
    
 */
    for (i = 0; i < moves.length; i++) {
        //  Transmit move
        radio.sendNumber(moves[i])
        //  Play tone corresponding to move
        if (moves[i] == 1) {
            CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0xff0000)
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (moves[i] == 2) {
            CutebotPro.colorLight(CutebotProRGBLight.RGBA, 0x00ff00)
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (moves[i] == 3) {
            CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0xff0000)
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        }
        
        music.rest(music.beat(BeatFraction.Half))
        CutebotPro.turnOffAllHeadlights()
    }
    music.rest(music.beat(BeatFraction.Breve))
    /** 
    Step 4 - Reversing Optimized Path
    Reversing the optimized path can be done by first reversing the order of
        the optimized path from the previous step and then subtracting each
        element from 4 to find the opposite of each of the steps taken.
    
 */
    let exitMoves = []
    for (i = 0; i < moves.length; i++) {
        //  Take 4 minus the opposite element of moves
        exitMoves.push(4 - moves[moves.length - i - 1])
    }
    //  Play tones representing path to exit
    for (i = 0; i < exitMoves.length; i++) {
        if (exitMoves[i] == 1) {
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (exitMoves[i] == 2) {
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        } else if (exitMoves[i] == 3) {
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
        }
        
        music.rest(music.beat(BeatFraction.Half))
    }
    /** 
    Step 5 - Exiting the Maze
    The bot can exit the maze by turning around, moving forwards, then
        simply following the list of exit moves.
    
 */
    //  Turn around and move forwards to next square
    turnRight()
    turnRight()
    moveForward()
    //  Follow list of moves to exit
    for (i = 0; i < exitMoves.length; i++) {
        //  Only options are 1 (left), 2 (forwards), or 3 (right)
        if (exitMoves[i] == 1) {
            turnLeft()
            moveForward()
        } else if (exitMoves[i] == 2) {
            moveForward()
        } else if (exitMoves[i] == 3) {
            turnRight()
            moveForward()
        }
        
    }
}

//  Button A Pressed
//  Button B Pressed
//  Radio Transmission
//  Interaction Handling
input.onButtonPressed(Button.A, function on_button_pressed_a() {
    basic.showLeds(`
    . . # . .
    . # . # .
    # . . . #
    # # # # #
    # . . . #
    `)
    basic.pause(500)
    basic.clearScreen()
})
input.onButtonPressed(Button.B, function on_button_pressed_b() {
    basic.showLeds(`
    # # # # .
    # . . . #
    # # # # .
    # . . . #
    # # # # .
    `)
    basic.pause(500)
    basic.clearScreen()
    navigateMaze(20, 300)
})
radio.onReceivedNumber(function on_received_number(move: number) {
    if (move == 1) {
        //  Turn left
        CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0xff0000)
        music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    } else if (move == 2) {
        //  Go straight
        CutebotPro.colorLight(CutebotProRGBLight.RGBA, 0x00ff00)
        music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    } else if (move == 3) {
        //  Turn right
        CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0xff0000)
        music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
    }
    
    music.rest(music.beat(BeatFraction.Half))
    CutebotPro.turnOffAllHeadlights()
})
