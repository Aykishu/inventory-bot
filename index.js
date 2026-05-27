// ================= IMPORTS =================

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const express = require('express');
const mongoose = require('mongoose');

// ================= EXPRESS =================

const app = express();

app.get('/', (req, res) => {
    res.send('Hells Legion Inventory Online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web server lancé.');
});

// ================= CONFIG =================

const config = {

    token: process.env.TOKEN,
    mongoUri: process.env.MONGO_URI,

    clientId: '1507287568440627261',
    guildId: '1478420890051018765',

    logChannelName: '📦・│log-stockage'

};

// ================= CLIENT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= CONNECTION EVENTS =================

client.on('disconnect', () => {
    console.log('❌ Bot déconnecté.');
});

client.on('reconnecting', () => {
    console.log('🔄 Reconnexion...');
});

client.on('resume', () => {
    console.log('✅ Session reprise.');
});

client.on('error', console.error);
client.on('warn', console.warn);

// ================= MONGODB =================

mongoose.connect(config.mongoUri)
.then(() => {
    console.log('✅ MongoDB connecté.');
})
.catch(console.error);

// ================= SCHEMA =================

const stockSchema = new mongoose.Schema({

    item: {
        type: String,
        required: true,
        unique: true
    },

    quantity: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        required: true
    }

});

const Stock = mongoose.model('Stock', stockSchema);

// ================= CATEGORIES =================

const categories = {

    ressources: '🔨 Ressources',
	ressources_rares: ' Ressources rares',
	rack: '🗄️ Rack',
    medical: '💊 Médical',
	hazmat: '☣️ Hazmat',
    armurerie: '🔫 Armurerie',
    vehicules: '🚗 Véhicules',
    nourriture: '🍔 Nourriture',
    divers: '📦 Divers'

};

// ================= ITEM EMOJIS =================

function getItemEmoji(itemName) {

    const name = itemName.toLowerCase();

    if (name.includes('bois')) return '🪵';
    if (name.includes('pierre')) return '🪨';
    if (name.includes('charbon')) return '⚫';
    if (name.includes('fer')) return '⛓️';
    if (name.includes('ferraille')) return '🔩';
    if (name.includes('eau')) return '💧';
    if (name.includes('bandage')) return '🩹';
    if (name.includes('medkit')) return '💉';
    if (name.includes('essence')) return '⛽';
    if (name.includes('munition')) return '🔸';
    if (name.includes('burger')) return '🍔';
    if (name.includes('pain')) return '🥖';
    if (name.includes('voiture')) return '🚗';
    if (name.includes('camion')) return '🚚';
    if (name.includes('arme')) return '🔫';

    return '📦';
}

// ================= TEMP STORAGE =================

const pendingAdds = new Map();
const pendingCategoryAdds = new Map();
const pendingItemAdds = new Map();

// ================= SAFE FUNCTIONS =================

async function safeReply(interaction, data) {

    try {

        if (interaction.deferred || interaction.replied) {
            return await interaction.followUp(data).catch(() => {});
        }

        return await interaction.reply(data).catch(() => {});

    } catch (err) {
        console.error(err);
    }
}

async function safeUpdate(interaction, data) {

    try {

        if (!interaction.replied && !interaction.deferred) {
            return await interaction.update(data).catch(() => {});
        }

    } catch (err) {
        console.error(err);
    }
}

// ================= COMMANDES =================

const commands = [

    new SlashCommandBuilder()
        .setName('inventaire')
        .setDescription('Ouvrir le panel inventaire')

].map(command => command.toJSON());

// ================= REGISTER =================

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
            { body: commands }
        );

        console.log('✅ Commandes enregistrées.');

    } catch (err) {
        console.error(err);
    }

})();

// ================= READY =================

client.once('clientReady', () => {
    console.log(`✅ ${client.user.tag} connecté.`);
});

// ================= EMBED =================

async function createMainEmbed() {

    const totalItems = await Stock.countDocuments();

    const totalQuantityResult = await Stock.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: '$quantity' }
            }
        }
    ]);

    const totalQuantity = totalQuantityResult[0]?.total || 0;

    return new EmbedBuilder()
        .setTitle('📦 HELLS LEGION • INVENTAIRE')
        .setDescription(`
Bienvenue dans le système de stockage.

🔨 Ressources
💎 Ressources rares
🗄️ Rack
💊 Médical
☣️ Hazmat
🔫 Armurerie
🚗 Véhicules
🍔 Nourriture
📦 Divers
`)
        .addFields({
            name: '📊 Statistiques',
            value:
`📦 Items : ${totalItems}
📈 Quantité totale : ${totalQuantity}`
        })
        .setColor('#8B0000')
        .setFooter({
            text: 'Inventaire by Aykishu'
        });
}

// ================= BUTTONS =================

function createButtons() {

    return [

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('view_stock')
                    .setLabel('Voir Stock')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('refresh_stock')
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)

            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('add_stock')
                    .setLabel('Ajouter')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('remove_stock')
                    .setLabel('Retirer')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('delete_stock')
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('search_stock')
                    .setLabel('Rechercher')
                    .setEmoji('🔍')
                    .setStyle(ButtonStyle.Primary)

            )

    ];
}

// ================= CATEGORY MENU =================

function createCategoryMenu(customId = 'category_select') {

    return new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder('📂 Choisir une catégorie')
                .addOptions([

                    {
                        label: 'Ressources',
                        value: 'ressources',
                        emoji: '🔨'
                    },

                    {
                        label: 'Ressources rares',
                        value: 'ressources_rares',
                        emoji: '💎'
                    },

                    {
                        label: 'Rack',
                        value: 'rack',
                        emoji: '🗄️'
                    },

                    {
                        label: 'Médical',
                        value: 'medical',
                        emoji: '💊'
                    },
					
                    {
                        label: 'Hazmat',
                        value: 'hazmat',
                        emoji: '☣️'
                    },
					
                    {
                        label: 'Armurerie',
                        value: 'armurerie',
                        emoji: '🔫'
                    },

                    {
                        label: 'Véhicules',
                        value: 'vehicules',
                        emoji: '🚗'
                    },

                    {
                        label: 'Nourriture',
                        value: 'nourriture',
                        emoji: '🍔'
                    },

                    {
                        label: 'Divers',
                        value: 'divers',
                        emoji: '📦'
                    }

                ])

        );

}

// ================= LOG FUNCTION =================

async function sendLog(interaction, embed) {

    try {

        const logChannel = interaction.guild.channels.cache.find(
            c => c.name === config.logChannelName
        );

        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }

    } catch (err) {
        console.error(err);
    }
}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    try {

        // ================= SLASH COMMAND =================

        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'inventaire') {

                const embed = await createMainEmbed();

                return safeReply(interaction, {
                    embeds: [embed],
                    components: [
                        ...createButtons(),
                        createCategoryMenu()
                    ]
                });
            }
        }

        // ================= BUTTONS =================

        if (interaction.isButton()) {

            // VIEW STOCK

            if (interaction.customId === 'view_stock') {

                const rows = await Stock.find().sort({
                    category: 1,
                    item: 1
                });

                if (rows.length === 0) {
                    return safeReply(interaction, {
                        content: '📦 Aucun stock enregistré.',
                        flags: 64
                    });
                }

  // ================= REGROUPEMENT PAR CATÉGORIE =================

const grouped = {};

rows.forEach(row => {

    if (!grouped[row.category]) {
        grouped[row.category] = [];
    }

    grouped[row.category].push(row);

});

// ================= DESCRIPTION =================

let description = '';

for (const category in grouped) {

    description += `\n━━━━━━━━━━━━━━\n`;
    description += `${categories[category].toUpperCase()}\n`;
    description += `━━━━━━━━━━━━━━\n`;

    grouped[category].forEach(item => {

        description += `└ 📦 ${item.item} : **${item.quantity}**\n`;

    });

    description += '\n';
}

                const embed = new EmbedBuilder()
                    .setTitle('📦 STOCK COMPLET')
                    .setDescription(description)
                    .setColor('#8B0000');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }

            // REFRESH

            if (interaction.customId === 'refresh_stock') {

                const embed = await createMainEmbed();

                return safeUpdate(interaction, {
                    embeds: [embed],
                    components: [
                        ...createButtons(),
                        createCategoryMenu()
                    ]
                });
            }

            // ADD

            if (interaction.customId === 'add_stock') {

    return safeReply(interaction, {
        content: '📂 Choisis une catégorie :',
        components: [
            createCategoryMenu('add_category_select')
        ],
        flags: 64
    });
}

            // REMOVE

            if (interaction.customId === 'remove_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('remove_stock_modal')
                    .setTitle('📤 Retirer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const quantiteInput = new TextInputBuilder()
                    .setCustomId('quantite')
                    .setLabel('Quantité')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput),
                    new ActionRowBuilder().addComponents(quantiteInput)
                );

                return interaction.showModal(modal);
            }

            // DELETE

            if (interaction.customId === 'delete_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('delete_stock_modal')
                    .setTitle('🗑️ Supprimer un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return interaction.showModal(modal);
            }

             // SEARCH

            if (interaction.customId === 'search_stock') {

                const modal = new ModalBuilder()
                    .setCustomId('search_stock_modal')
                    .setTitle('🔍 Rechercher un item');

                const objetInput = new TextInputBuilder()
                    .setCustomId('objet')
                    .setLabel('Nom de l’objet')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(objetInput)
                );

                return interaction.showModal(modal);
            }
        }

        // ================= MODALS =================

        if (interaction.isModalSubmit()) {

            // ADD STOCK

            if (interaction.customId === 'add_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = Number(
                    interaction.fields.getTextInputValue('quantite')
                );

                if (isNaN(quantite) || quantite <= 0) {

                    return safeReply(interaction, {
                        content: '❌ Quantité invalide.',
                        flags: 64
                    });
                }

                pendingAdds.set(interaction.user.id, {
                    objet,
                    quantite
                });

                return safeReply(interaction, {
                    content: '📂 Choisis une catégorie :',
                    components: [
                        createCategoryMenu('add_category_select')
                    ],
                    flags: 64
                });
            }

            // REMOVE STOCK

            if (interaction.customId === 'remove_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const quantite = Number(
                    interaction.fields.getTextInputValue('quantite')
                );

                const item = await Stock.findOne({
                    item: objet
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Item introuvable.',
                        flags: 64
                    });
                }

                item.quantity -= quantite;

                if (item.quantity < 0) {
                    item.quantity = 0;
                }

                await item.save();

                await safeReply(interaction, {
                    content: '✅ Stock retiré.',
                    flags: 64
                });

                const embed = new EmbedBuilder()
                    .setTitle('📤 STOCK RETIRÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${objet}**
➖ Quantité retirée : **${quantite}**
📂 Catégorie : **${categories[item.category]}**
📉 Stock restant : **${item.quantity}**
`)
                    .setColor('Red');

                sendLog(interaction, embed);
            }

            // DELETE STOCK

            if (interaction.customId === 'delete_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const item = await Stock.findOne({
                    item: objet
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Item introuvable.',
                        flags: 64
                    });
                }

                await Stock.deleteOne({
                    item: objet
                });

                await safeReply(interaction, {
                    content: '✅ Item supprimé.',
                    flags: 64
                });

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ ITEM SUPPRIMÉ')
                    .setDescription(`
👤 Membre : ${interaction.user}

📦 Item supprimé : **${objet}**
`)
                    .setColor('DarkRed');

                sendLog(interaction, embed);
            }

            // SEARCH STOCK

            if (interaction.customId === 'search_stock_modal') {

                const objet = interaction.fields.getTextInputValue('objet');

                const item = await Stock.findOne({
                    item: {
                        $regex: objet,
                        $options: 'i'
                    }
                });

                if (!item) {

                    return safeReply(interaction, {
                        content: '❌ Aucun item trouvé.',
                        flags: 64
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔍 ITEM TROUVÉ')
                    .setDescription(`
📦 Item : **${item.item}**
📊 Quantité : **${item.quantity}**
📂 Catégorie : **${categories[item.category]}**
`)
                    .setColor('Blue');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }
// ================= ADD STOCK QUANTITY =================

if (interaction.customId === 'add_stock_quantity_modal') {

    const quantite = Number(
        interaction.fields.getTextInputValue('quantite')
    );

    if (isNaN(quantite) || quantite <= 0) {

        return safeReply(interaction, {
            content: '❌ Quantité invalide.',
            flags: 64
        });
    }

    const category = pendingCategoryAdds.get(interaction.user.id);
    const objet = pendingItemAdds.get(interaction.user.id);

    if (!category || !objet) {

        return safeReply(interaction, {
            content: '❌ Données expirées.',
            flags: 64
        });
    }

    let item = await Stock.findOne({
        item: objet
    });

    if (!item) {

        return safeReply(interaction, {
            content: '❌ Objet introuvable.',
            flags: 64
        });
    }

    item.quantity += quantite;

    await item.save();

    pendingCategoryAdds.delete(interaction.user.id);
    pendingItemAdds.delete(interaction.user.id);

    await safeReply(interaction, {
        content: '✅ Stock ajouté.',
        flags: 64
    });

    const embed = new EmbedBuilder()
        .setTitle('📥 STOCK AJOUTÉ')
        .setDescription(`
👤 Membre : ${interaction.user}

📦 Item : **${objet}**
➕ Quantité : **${quantite}**
📂 Catégorie : **${categories[category]}**
📈 Stock restant : **${item.quantity}**
`)
        .setColor('Green');

    sendLog(interaction, embed);
}
			
        }

        // ================= SELECT MENUS =================

        if (interaction.isStringSelectMenu()) {

            // VIEW CATEGORY

            if (interaction.customId === 'category_select') {

                const category = interaction.values[0];

                const rows = await Stock.find({
                    category
                }).sort({
                    item: 1
                });

                let description = '';

                if (rows.length === 0) {

                    description = '📦 Aucun item dans cette catégorie.';

                } else {

                    rows.forEach(row => {

                        description += `
📦 **${row.item}**
└ Quantité : ${row.quantity}

`;
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(categories[category])
                    .setDescription(description)
                    .setColor('#8B0000');

                return safeReply(interaction, {
                    embeds: [embed],
                    flags: 64
                });
            }

// ================= ADD CATEGORY SELECT =================

if (interaction.customId === 'add_category_select') {

    const category = interaction.values[0];

    pendingCategoryAdds.set(interaction.user.id, category);

    const items = await Stock.find({
        category
    }).sort({
        item: 1
    });

    if (items.length === 0) {

        return safeReply(interaction, {
            content: '❌ Aucun objet dans cette catégorie.',
            flags: 64
        });
    }

    const options = items.slice(0, 25).map(item => ({
        label: item.item,
        value: item.item,
        emoji: '📦'
    }));

    const menu = new ActionRowBuilder()
        .addComponents(

            new StringSelectMenuBuilder()
                .setCustomId('add_item_select')
                .setPlaceholder('📦 Choisir un objet')
                .addOptions(options)

        );

    return safeReply(interaction, {
        content: '📦 Choisis un objet :',
        components: [menu],
        flags: 64
    });
}

// ================= ADD ITEM SELECT =================

if (interaction.customId === 'add_item_select') {

    const item = interaction.values[0];

    pendingItemAdds.set(interaction.user.id, item);

    const modal = new ModalBuilder()
        .setCustomId('add_stock_quantity_modal')
        .setTitle('➕ Ajouter du stock');

    const quantityInput = new TextInputBuilder()
        .setCustomId('quantite')
        .setLabel('Quantité')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(quantityInput)
    );

    return interaction.showModal(modal);
}

        }

    } catch (err) {
        console.error(err);
    }

});

// ================= ERROR HANDLERS =================

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= AUTO RECONNECT =================

client.on('disconnect', async () => {

    console.log('⚠️ Déconnexion détectée.');

    try {

        await client.destroy();

    } catch {}

    setTimeout(async () => {

        try {

            await client.login(config.token);

            console.log('✅ Reconnexion effectuée.');

        } catch (err) {

            console.error('❌ Erreur reconnexion :', err);

        }

    }, 5000);

});

// ================= LOGIN =================

client.login(config.token);