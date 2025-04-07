# Set Group for Radio Communications
radio.set_group(8)

# Basic Functions for Movement
def isWall(distanceThreshold):
    return CutebotPro.ultrasonic(SonarUnit.CENTIMETERS) < distanceThreshold

def turnLeft():
    CutebotPro.color_light(CutebotProRGBLight.RGBL, 0xff0000)
    CutebotPro.trolley_steering(CutebotProTurn.LEFT_IN_PLACE, 95)
    CutebotPro.turn_off_all_headlights()

def turnRight():
    CutebotPro.color_light(CutebotProRGBLight.RGBR, 0xff0000)
    CutebotPro.trolley_steering(CutebotProTurn.RIGHT_IN_PLACE, 95)
    CutebotPro.turn_off_all_headlights()

def moveForward():
    CutebotPro.color_light(CutebotProRGBLight.RGBA, 0x00ff00)
    CutebotPro.pwm_cruise_control(40, 40)
    CutebotPro.distance_running(CutebotProOrientation.ADVANCE, 30.7, CutebotProDistanceUnits.CM)
    CutebotPro.turn_off_all_headlights()

# Function to Navigate Maze
def navigateMaze(distanceThreshold, magnetThreshold):
    '''
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
    '''
    moves = [] # List to store past moves
    # Navigate maze until magnet is found
    while (abs(input.magnetic_force(Dimension.STRENGTH)) < magnetThreshold):
        # Check left direction first
        turnLeft()
        move = 1
        # Turn right until open move found
        while isWall(distanceThreshold):
            turnRight()
            move += 1 # Increment to track which direction is moved
        moveForward() # Move forward to next square
        moves.append(move) # Save direction moved to list
    basic.show_leds("""
    # # # # #
    # # # # #
    # # # # #
    # # # # #
    # # # # #
    """) # To show that the bomb has been found

    # Play tones representing path taken
    for i in range(len(moves)):
        if moves[i] == 1:
            music.play(music.tone_playable(Note.C, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        elif moves[i] == 2:
            music.play(music.tone_playable(Note.E, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        elif moves[i] == 3:
            music.play(music.tone_playable(Note.G, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        elif moves[i] == 4:
            music.play(music.tone_playable(Note.C5, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))

    music.rest(music.beat(BeatFraction.BREVE))

    '''
    Step 2 - Calculating Optimized Path:
    The move list is optimized by removing moves that lead towards dead ends.
    Dead ends require the bot to turn around, represented by a 4 in the move list.
    Duplicated moves leading up to these dead ends will add up to 4 as well.
    The resultant move instead of turning towards the last end will be the sum
        of the moves entering and exiting the dead end section.
    '''
    i = 0 # Loop through the list of moves
    while i < len(moves):
        if moves[i] == 4: # If the bot turned around on a certain move (reached a dead end)
            j = 1 # Use a second loop to find extent of dead end path
            while (i - j) >= 0 and (i + j) < len(moves) and (moves[i - j] + moves[i + j]) == 4:
                j += 1 # Increment j to move on to next pair of values
            # Build new list of moves with dead ends filtered out
            newMoves = moves[:i - j] # Moves before dead end
            newMoves.append(moves[i - j] + moves[i + j]) # Move made of combined moves entering and leaving dead end
            for k in range(i + j + 1, len(moves)): # Moves after dead end
                newMoves.append(moves[k])
            moves = newMoves
            i = 0 # Length and index of list changes. I could calculate the new list but its easier to just start at the beginning again.
        i += 1 # Increment i to move on to next index

    '''
    Step 3 - Transmitting Optimized Path
    Transmitting the optimized path simply requires iterating through moves
        and transmitting each value.
    To confirm transmission and reception, each bot will play a tone corresponding
        to the move transmitted.
    '''
    for i in range(len(moves)):
        # Transmit move
        radio.send_number(moves[i])

        # Play tone corresponding to move
        if moves[i] == 1:
            music.play(music.tone_playable(Note.C, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        elif moves[i] == 2:
            music.play(music.tone_playable(Note.E, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        elif moves[i] == 3:
            music.play(music.tone_playable(Note.G, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))

    music.rest(music.beat(BeatFraction.BREVE))

    '''
    Step 4 - Reversing Optimized Path
    Reversing the optimized path can be done by first reversing the order of
        the optimized path from the previous step and then subtracting each
        element from 4 to find the opposite of each of the steps taken.
    '''
    exitMoves = []
    for i in range(len(moves)):
        # Take 4 minus the opposite element of moves
        exitMoves.append(4 - moves[len(moves) - i - 1])

    # Play tones representing path to exit
    for i in range(len(exitMoves)):
        if exitMoves[i] == 1:
            music.play(music.tone_playable(Note.C, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        if exitMoves[i] == 2:
            music.play(music.tone_playable(Note.E, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        if exitMoves[i] == 3:
            music.play(music.tone_playable(Note.G, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))
        if exitMoves[i] == 4:
            music.play(music.tone_playable(Note.C5, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
            music.rest(music.beat(BeatFraction.HALF))

    '''
    Step 5 - Exiting the Maze
    The bot can exit the maze by turning around, moving forwards, then
        simply following the list of exit moves.
    '''
    # Turn around and move forwards to next square
    turnRight()
    turnRight()
    moveForward()
    # Follow list of moves to exit
    for i in range(len(exitMoves)):
        # Only options are 1 (left), 2 (forwards), or 3 (right)
        if exitMoves[i] == 1:
            turnLeft()
            moveForward()
        elif exitMoves[i] == 2:
            moveForward()
        elif exitMoves[i] == 3:
            turnRight()
            moveForward()

# Button A Pressed
def on_button_pressed_a():
    basic.show_leds("""
    . . # . .
    . # . # .
    # . . . #
    # # # # #
    # . . . #
    """)
    basic.pause(500)
    basic.clear_screen()
    while True:
        basic.show_number(int(abs(input.magnetic_force(Dimension.STRENGTH))), 50)

# Button B Pressed
def on_button_pressed_b():
    basic.show_leds("""
    # # # # .
    # . . . #
    # # # # .
    # . . . #
    # # # # .
    """)
    basic.pause(500)
    basic.clear_screen()
    navigateMaze(20, 300)

# Radio Transmission
def on_received_number(move):
    if move == 1:
        music.play(music.tone_playable(Note.C, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
        music.rest(music.beat(BeatFraction.HALF))
    elif move == 2:
        music.play(music.tone_playable(Note.E, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
        music.rest(music.beat(BeatFraction.HALF))
    elif move == 3:
        music.play(music.tone_playable(Note.G, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)
        music.rest(music.beat(BeatFraction.HALF))

# Interaction Handling
input.on_button_pressed(Button.A, on_button_pressed_a)
input.on_button_pressed(Button.B, on_button_pressed_b)
radio.on_received_number(on_received_number)