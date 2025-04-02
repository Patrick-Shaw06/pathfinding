function isWall(distanceThreshold: number) {
    return CutebotPro.ultrasonic(SonarUnit.Centimeters) < distanceThreshold
}

function turnLeft() {
    CutebotPro.colorLight(CutebotProRGBLight.RGBL, 0xff0000)
    CutebotPro.trolleySteering(CutebotProTurn.LeftInPlace, 95)
    CutebotPro.turnOffAllHeadlights()
}

function turnRight() {
    CutebotPro.colorLight(CutebotProRGBLight.RGBR, 0xff0000)
    CutebotPro.trolleySteering(CutebotProTurn.RightInPlace, 95)
    CutebotPro.turnOffAllHeadlights()
}

function moveForward() {
    CutebotPro.colorLight(CutebotProRGBLight.RGBA, 0x00ff00)
    CutebotPro.pwmCruiseControl(40, 40)
    CutebotPro.distanceRunning(CutebotProOrientation.Advance, 30, CutebotProDistanceUnits.Cm)
    CutebotPro.turnOffAllHeadlights()
}

function navigateMaze(distanceThreshold: number, magnetThreshold: number) {
    let move: number;
    let i: number;
    let j: number;
    let newMoves: number[];
    /** 
    Navigating the maze is broken into four steps as follows:
        1: Pathfinding through the maze until the bomb is found
        2: Calculating an optimized path to the bomb
        3: Reversing this path to optimize exiting
        4: Exiting the maze
    
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
    while (Math.abs(input.magneticForce(Dimension.Y)) < magnetThreshold) {
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
    # # # # #
    # # # # #
    # # # # #
    # # # # #
    # # # # #
    `)
    for (i = 0; i < moves.length; i++) {
        if (moves[i] == 1) {
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 2) {
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 3) {
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 4) {
            music.play(music.tonePlayable(Note.C5, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
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
    for (i = 0; i < moves.length; i++) {
        if (moves[i] == 1) {
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 2) {
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 3) {
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (moves[i] == 4) {
            music.play(music.tonePlayable(Note.C5, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
    }
    music.rest(music.beat(BeatFraction.Breve))
    /** 
    Step 3 - Reversing Optimized Path
    Reversing the optimized path can be done by first reversing the order of
        the optimized path from the previous step and then subtracting each
        element from 4 to find the opposite of each of the steps taken.
    
 */
    let exitMoves = []
    for (i = 0; i < moves.length; i++) {
        //  Take 4 minus the opposite element of moves
        exitMoves.push(4 - moves[moves.length - i - 1])
    }
    for (i = 0; i < exitMoves.length; i++) {
        if (exitMoves[i] == 1) {
            music.play(music.tonePlayable(Note.C, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (exitMoves[i] == 2) {
            music.play(music.tonePlayable(Note.E, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (exitMoves[i] == 3) {
            music.play(music.tonePlayable(Note.G, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
        if (exitMoves[i] == 4) {
            music.play(music.tonePlayable(Note.C5, music.beat(BeatFraction.Whole)), music.PlaybackMode.UntilDone)
            music.rest(music.beat(BeatFraction.Half))
        }
        
    }
    /** 
    Step 4 - Exiting the Maze
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
    //  Move forward fully out of maze
    moveForward()
}

function turnLeftTest() {
    CutebotPro.pwmCruiseControl(-40, 40)
    CutebotPro.angleRunning(CutebotProWheel.RightWheel, 330, CutebotProAngleUnits.Angle)
}

//  CutebotPro.trolley_steering(CutebotProTurn.LEFT_IN_PLACE, 90)
function turnRightTest() {
    //  CutebotPro.pwm_cruise_control(40, -40)
    //  CutebotPro.angle_running(CutebotProWheel.LEFT_WHEEL, 330, CutebotProAngleUnits.ANGLE)
    CutebotPro.trolleySteering(CutebotProTurn.RightInPlace, 95)
}

input.onButtonPressed(Button.A, function on_button_pressed_a() {
    basic.showLeds(`
    . . # . .
    . # . # .
    # . . . #
    # # # # #
    # . . . #
    `)
    basic.pause(1000)
    basic.clearScreen()
    for (let i = 0; i < 4; i++) {
        turnLeftTest()
    }
})
input.onButtonPressed(Button.B, function run() {
    navigateMaze(20, 300)
})
