
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useGameInvitations } from "@/hooks/useGameInvitations";

interface GameInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: any;
  currentUser: any;
}

const GameInviteDialog = ({ open, onOpenChange, friend, currentUser }: GameInviteDialogProps) => {
  const [gameType, setGameType] = useState<string>("");
  const [stakeAmount, setStakeAmount] = useState(5);
  const { sendInvitation } = useGameInvitations();

  const games = [
    { id: "tic_tac_toe", name: "Tic Tac Toe", icon: "⭕" },
    { id: "rock_paper_scissors", name: "Rock Paper Scissors", icon: "✂️" },
    { id: "number_guessing", name: "Number Guessing", icon: "🔢" }
  ];

  const handleSendInvite = async () => {
    if (!gameType) {
      toast({
        title: "Select a Game",
        description: "Please select a game to invite your friend to play.",
        variant: "destructive"
      });
      return;
    }

    if (stakeAmount > currentUser.gold) {
      toast({
        title: "Insufficient Gold",
        description: `You need at least ${stakeAmount} Gold to send this invitation.`,
        variant: "destructive"
      });
      return;
    }

    const { error } = await sendInvitation(friend.id, gameType, stakeAmount);

    if (error) {
      toast({
        title: "Failed to Send Invitation",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Invitation Sent!",
        description: `Game invitation sent to ${friend.username}`,
      });
      onOpenChange(false);
      setGameType("");
      setStakeAmount(5);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-600 mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Invite {friend?.username} to Play
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Choose a game and stake amount to challenge your friend!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="game" className="text-white text-sm">Select Game</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                <SelectValue placeholder="Choose a game..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id} className="text-white hover:bg-gray-600">
                    <span className="flex items-center">
                      <span className="mr-2">{game.icon}</span>
                      {game.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="stake" className="text-white text-sm">Stake Amount (Gold)</Label>
            <Input
              id="stake"
              type="number"
              min={5}
              max={currentUser?.gold || 100}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(parseInt(e.target.value))}
              className="bg-gray-700 border-gray-600 text-white mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">
              Available: {currentUser?.gold || 0} Gold
            </p>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button 
              onClick={handleSendInvite}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-sm"
              disabled={!gameType || stakeAmount < 5 || stakeAmount > (currentUser?.gold || 0)}
            >
              Send Invitation
            </Button>
            <Button 
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-white hover:bg-gray-700 bg-gray-700 text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameInviteDialog;
